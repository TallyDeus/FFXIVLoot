using FFXIVLoot.Domain.Entities;

namespace FFXIVLoot.Domain.Interfaces;

/// <summary>
/// Repository interface for member data access operations
/// </summary>
public interface IMemberRepository
{
    /// <summary>
    /// Gets all members
    /// </summary>
    Task<List<Member>> GetAllAsync();

    /// <summary>
    /// Gets a member by ID
    /// </summary>
    Task<Member?> GetByIdAsync(Guid id);

    /// <summary>
    /// Creates a new member
    /// </summary>
    Task<Member> CreateAsync(Member member);

    /// <summary>
    /// Updates an existing member
    /// </summary>
    Task<Member> UpdateAsync(Member member);

    /// <summary>
    /// Deletes a member by ID
    /// </summary>
    Task DeleteAsync(Guid id);
}

