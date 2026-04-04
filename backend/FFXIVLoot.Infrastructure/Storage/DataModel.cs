using FFXIVLoot.Domain.Entities;

namespace FFXIVLoot.Infrastructure.Storage;

/// <summary>
/// Data model for JSON storage
/// </summary>
public class DataModel
{
    /// <summary>
    /// Bump when member JSON shape changes (e.g. IsActive default migration).
    /// </summary>
    public int SchemaVersion { get; set; } = 2;

    /// <summary>
    /// List of all members
    /// </summary>
    public List<Member> Members { get; set; } = new();
}

