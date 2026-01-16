using FFXIVLoot.Domain.Entities;

namespace FFXIVLoot.Infrastructure.Storage;

/// <summary>
/// Data model for JSON storage
/// </summary>
public class DataModel
{
    /// <summary>
    /// List of all members
    /// </summary>
    public List<Member> Members { get; set; } = new();
}

