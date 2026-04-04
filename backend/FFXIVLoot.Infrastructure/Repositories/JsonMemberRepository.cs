using FFXIVLoot.Application.Interfaces;
using FFXIVLoot.Domain.Entities;
using FFXIVLoot.Domain.Interfaces;
using FFXIVLoot.Infrastructure.Storage;
using Microsoft.Extensions.Configuration;

namespace FFXIVLoot.Infrastructure.Repositories;

/// <summary>
/// JSON file-based repository for member data
/// </summary>
public class JsonMemberRepository : IMemberRepository
{
    private readonly IRaidTierManagement _raidTierManagement;
    private readonly IConfiguration? _configuration;

    /// <summary>
    /// Initializes a new instance of JsonMemberRepository
    /// </summary>
    public JsonMemberRepository(IRaidTierManagement raidTierManagement, IConfiguration? configuration = null)
    {
        _raidTierManagement = raidTierManagement ?? throw new ArgumentNullException(nameof(raidTierManagement));
        _configuration = configuration;
    }

    private async Task<JsonFileStorage> StorageAsync()
    {
        var tierId = await _raidTierManagement.GetCurrentTierIdAsync();
        var path = Path.Combine(_raidTierManagement.DataRoot, "raid-tiers", tierId.ToString(), "members.json");
        return new JsonFileStorage(path);
    }

    /// <summary>
    /// Gets all members
    /// </summary>
    public async Task<List<Member>> GetAllAsync()
    {
        var storage = await StorageAsync();
        var data = await storage.ReadAsync<DataModel>() ?? new DataModel();
        var members = data.Members;
        var needsSave = false;

        if (data.SchemaVersion < 2)
        {
            foreach (var member in members)
                member.IsActive = true;
            data.SchemaVersion = 2;
            needsSave = true;
        }
        
        foreach (var member in members)
        {
            var memberNeedsUpdate = false;
            
            if (member.OffSpecBisItems == null)
            {
                member.OffSpecBisItems = new List<Domain.Entities.GearItem>();
                memberNeedsUpdate = true;
            }
            if (member.MainSpecLinkStates == null)
            {
                member.MainSpecLinkStates = new Dictionary<string, Dictionary<Domain.Enums.GearSlot, (bool, bool)>>();
                memberNeedsUpdate = true;
            }
            if (member.OffSpecLinkStates == null)
            {
                member.OffSpecLinkStates = new Dictionary<string, Dictionary<Domain.Enums.GearSlot, (bool, bool)>>();
                memberNeedsUpdate = true;
            }
            if (_configuration != null)
            {
                var defaultAdministrators = _configuration.GetSection("DefaultAdministrators").Get<string[]>() ?? Array.Empty<string>();
                if (defaultAdministrators.Any(name => name.Equals(member.Name, StringComparison.OrdinalIgnoreCase)))
                {
                    if (member.PermissionRole != Domain.Enums.PermissionRole.Administrator)
                    {
                        member.PermissionRole = Domain.Enums.PermissionRole.Administrator;
                        memberNeedsUpdate = true;
                    }
                }
            }
            else if (member.PermissionRole == default(Domain.Enums.PermissionRole))
            {
                member.PermissionRole = Domain.Enums.PermissionRole.User;
                memberNeedsUpdate = true;
            }
            if (string.IsNullOrEmpty(member.PinHash))
            {
                member.PinHash = Application.Helpers.PinHelper.HashPin(Application.Helpers.PinHelper.DefaultPin);
                memberNeedsUpdate = true;
            }
            
            if (memberNeedsUpdate)
            {
                needsSave = true;
            }
        }
        
        if (needsSave)
        {
            await storage.WriteAsync(data);
        }
        
        return members;
    }

    /// <summary>
    /// Gets a member by ID
    /// </summary>
    public async Task<Member?> GetByIdAsync(Guid id)
    {
        var members = await GetAllAsync();
        var member = members.FirstOrDefault(m => m.Id == id);
        return member;
    }

    /// <summary>
    /// Creates a new member
    /// </summary>
    public async Task<Member> CreateAsync(Member member)
    {
        if (member == null)
        {
            throw new ArgumentNullException(nameof(member));
        }

        var storage = await StorageAsync();
        var data = await storage.ReadAsync<DataModel>() ?? new DataModel();
        
        if (member.Id == Guid.Empty)
        {
            member.Id = Guid.NewGuid();
        }

        if (string.IsNullOrEmpty(member.PinHash))
        {
            member.PinHash = Application.Helpers.PinHelper.HashPin(Application.Helpers.PinHelper.DefaultPin);
        }

        if (_configuration != null && member.PermissionRole == default(Domain.Enums.PermissionRole))
        {
            var defaultAdministrators = _configuration.GetSection("DefaultAdministrators").Get<string[]>() ?? Array.Empty<string>();
            if (defaultAdministrators.Any(name => name.Equals(member.Name, StringComparison.OrdinalIgnoreCase)))
            {
                member.PermissionRole = Domain.Enums.PermissionRole.Administrator;
            }
        }
        else if (member.PermissionRole == default(Domain.Enums.PermissionRole))
        {
            member.PermissionRole = Domain.Enums.PermissionRole.User;
        }

        data.Members.Add(member);
        await storage.WriteAsync(data);
        
        return member;
    }

    /// <summary>
    /// Updates an existing member
    /// </summary>
    public async Task<Member> UpdateAsync(Member member)
    {
        if (member == null)
        {
            throw new ArgumentNullException(nameof(member));
        }

        var storage = await StorageAsync();
        var data = await storage.ReadAsync<DataModel>() ?? new DataModel();
        var existingMember = data.Members.FirstOrDefault(m => m.Id == member.Id);
        
        if (existingMember == null)
        {
            throw new InvalidOperationException($"Member with ID {member.Id} not found");
        }

        // Update properties
        var index = data.Members.IndexOf(existingMember);
        data.Members[index] = member;
        
        await storage.WriteAsync(data);
        
        return member;
    }

    /// <summary>
    /// Deletes a member by ID
    /// </summary>
    public async Task DeleteAsync(Guid id)
    {
        var storage = await StorageAsync();
        var data = await storage.ReadAsync<DataModel>() ?? new DataModel();
        var member = data.Members.FirstOrDefault(m => m.Id == id);
        
        if (member != null)
        {
            data.Members.Remove(member);
            await storage.WriteAsync(data);
        }
    }
}

