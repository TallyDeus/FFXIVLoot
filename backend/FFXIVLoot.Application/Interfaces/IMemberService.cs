using FFXIVLoot.Application.DTOs;

namespace FFXIVLoot.Application.Interfaces;

/// <summary>
/// Service interface for managing raid members
/// </summary>
public interface IMemberService
{
    /// <summary>
    /// Gets all members
    /// </summary>
    /// <param name="activeOnly">When true, returns only members with <see cref="MemberDto.IsActive"/> true.</param>
    Task<List<MemberDto>> GetAllMembersAsync(bool activeOnly = false);

    /// <summary>
    /// Gets a member by ID
    /// </summary>
    Task<MemberDto?> GetMemberByIdAsync(Guid id);

    /// <summary>
    /// Creates a new member
    /// </summary>
    Task<MemberDto> CreateMemberAsync(MemberDto memberDto);

    /// <summary>
    /// Updates an existing member
    /// </summary>
    /// <param name="allowActiveFromPayload">When false, <see cref="MemberDto.IsActive"/> is ignored and the stored value is kept.</param>
    Task<MemberDto> UpdateMemberAsync(MemberDto memberDto, bool allowActiveFromPayload = false);

    /// <summary>
    /// Deletes a member by ID
    /// </summary>
    Task DeleteMemberAsync(Guid id);

    /// <summary>
    /// Updates a member's PIN
    /// </summary>
    Task UpdatePinAsync(Guid memberId, string currentPin, string newPin);

    /// <summary>
    /// Sets whether the member is active (visible on BiS tracker).
    /// </summary>
    Task<MemberDto> SetMemberActiveAsync(Guid memberId, bool isActive);
}

