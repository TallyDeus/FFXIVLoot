using FFXIVLoot.Application.DTOs;
using FFXIVLoot.Application.Helpers;
using FFXIVLoot.Application.Interfaces;
using FFXIVLoot.Domain.Interfaces;
using Microsoft.Extensions.Configuration;

namespace FFXIVLoot.Application.Services;

/// <summary>
/// Service for managing raid members
/// </summary>
public class MemberService : IMemberService
{
    private readonly IMemberRepository _memberRepository;
    private readonly IConfiguration _configuration;

    /// <summary>
    /// Initializes a new instance of MemberService
    /// </summary>
    public MemberService(IMemberRepository memberRepository, IConfiguration configuration)
    {
        _memberRepository = memberRepository ?? throw new ArgumentNullException(nameof(memberRepository));
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
    }

    /// <summary>
    /// Gets all members
    /// </summary>
    public async Task<List<MemberDto>> GetAllMembersAsync()
    {
        var members = await _memberRepository.GetAllAsync();
        return members.Select(MapToDto).ToList();
    }

    /// <summary>
    /// Gets a member by ID
    /// </summary>
    public async Task<MemberDto?> GetMemberByIdAsync(Guid id)
    {
        var member = await _memberRepository.GetByIdAsync(id);
        return member != null ? MapToDto(member) : null;
    }

    /// <summary>
    /// Creates a new member
    /// </summary>
    public async Task<MemberDto> CreateMemberAsync(MemberDto memberDto)
    {
        var member = MapToEntity(memberDto);
        
        if (string.IsNullOrEmpty(member.PinHash))
        {
            member.PinHash = PinHelper.HashPin(PinHelper.DefaultPin);
        }
        
        if (member.PermissionRole == Domain.Enums.PermissionRole.User)
        {
            var defaultAdministrators = _configuration.GetSection("DefaultAdministrators").Get<string[]>() ?? Array.Empty<string>();
            if (defaultAdministrators.Any(name => name.Equals(member.Name, StringComparison.OrdinalIgnoreCase)))
            {
                member.PermissionRole = Domain.Enums.PermissionRole.Administrator;
            }
        }
        
        var createdMember = await _memberRepository.CreateAsync(member);
        return MapToDto(createdMember);
    }

    /// <summary>
    /// Updates an existing member
    /// </summary>
    public async Task<MemberDto> UpdateMemberAsync(MemberDto memberDto)
    {
        var existingMember = await _memberRepository.GetByIdAsync(memberDto.Id);
        if (existingMember == null)
        {
            throw new InvalidOperationException($"Member with ID {memberDto.Id} not found");
        }

        var member = MapToEntity(memberDto);
        
        if (string.IsNullOrWhiteSpace(member.XivGearLink))
        {
            member.BisItems = new List<Domain.Entities.GearItem>();
        }
        else
        {
            member.BisItems = existingMember.BisItems;
        }
        
        if (string.IsNullOrWhiteSpace(member.OffSpecXivGearLink))
        {
            member.OffSpecBisItems = new List<Domain.Entities.GearItem>();
        }
        else
        {
            member.OffSpecBisItems = existingMember.OffSpecBisItems;
        }
        
        if (string.IsNullOrEmpty(member.PinHash))
        {
            member.PinHash = existingMember.PinHash;
        }
        
        var updatedMember = await _memberRepository.UpdateAsync(member);
        return MapToDto(updatedMember);
    }

    /// <summary>
    /// Updates a member's PIN
    /// </summary>
    public async Task UpdatePinAsync(Guid memberId, string currentPin, string newPin)
    {
        var member = await _memberRepository.GetByIdAsync(memberId);
        if (member == null)
        {
            throw new InvalidOperationException($"Member with ID {memberId} not found");
        }

        if (!PinHelper.VerifyPin(currentPin, member.PinHash))
        {
            throw new UnauthorizedAccessException("Invalid current PIN");
        }

        if (string.IsNullOrWhiteSpace(newPin) || newPin.Length != 4 || !newPin.All(char.IsDigit))
        {
            throw new ArgumentException("PIN must be exactly 4 digits");
        }

        member.PinHash = PinHelper.HashPin(newPin);
        await _memberRepository.UpdateAsync(member);
    }

    /// <summary>
    /// Deletes a member by ID
    /// </summary>
    public async Task DeleteMemberAsync(Guid id)
    {
        await _memberRepository.DeleteAsync(id);
    }

    private static MemberDto MapToDto(Domain.Entities.Member member)
    {
        return new MemberDto
        {
            Id = member.Id,
            Name = member.Name,
            Role = member.Role,
            XivGearLink = member.XivGearLink,
            BisItems = member.BisItems.Select(MapGearItemToDto).ToList(),
            OffSpecXivGearLink = member.OffSpecXivGearLink,
            OffSpecBisItems = member.OffSpecBisItems.Select(MapGearItemToDto).ToList(),
            PermissionRole = member.PermissionRole,
            ProfileImageUrl = member.ProfileImageUrl
        };
    }

    private static Domain.Entities.Member MapToEntity(MemberDto dto)
    {
        return new Domain.Entities.Member
        {
            Id = dto.Id,
            Name = dto.Name,
            Role = dto.Role,
            XivGearLink = dto.XivGearLink,
            BisItems = dto.BisItems.Select(MapGearItemToEntity).ToList(),
            OffSpecXivGearLink = dto.OffSpecXivGearLink,
            OffSpecBisItems = dto.OffSpecBisItems.Select(MapGearItemToEntity).ToList(),
            PermissionRole = dto.PermissionRole,
            ProfileImageUrl = dto.ProfileImageUrl
        };
    }

    private static GearItemDto MapGearItemToDto(Domain.Entities.GearItem item)
    {
        return new GearItemDto
        {
            Id = item.Id,
            Slot = item.Slot,
            ItemName = item.ItemName,
            ItemType = item.ItemType,
            IsAcquired = item.IsAcquired,
            UpgradeMaterialAcquired = item.UpgradeMaterialAcquired
        };
    }

    private static Domain.Entities.GearItem MapGearItemToEntity(GearItemDto dto)
    {
        return new Domain.Entities.GearItem
        {
            Id = dto.Id,
            Slot = dto.Slot,
            ItemName = dto.ItemName,
            ItemType = dto.ItemType,
            IsAcquired = dto.IsAcquired,
            UpgradeMaterialAcquired = dto.UpgradeMaterialAcquired
        };
    }
}
