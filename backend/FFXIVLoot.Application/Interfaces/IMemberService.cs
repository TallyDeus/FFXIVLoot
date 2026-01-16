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
    Task<List<MemberDto>> GetAllMembersAsync();

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
    Task<MemberDto> UpdateMemberAsync(MemberDto memberDto);

    /// <summary>
    /// Deletes a member by ID
    /// </summary>
    Task DeleteMemberAsync(Guid id);

    /// <summary>
    /// Updates a member's PIN
    /// </summary>
    Task UpdatePinAsync(Guid memberId, string currentPin, string newPin);
}

