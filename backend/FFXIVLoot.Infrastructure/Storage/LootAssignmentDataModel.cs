using FFXIVLoot.Domain.Entities;

namespace FFXIVLoot.Infrastructure.Storage;

/// <summary>
/// Data model for loot assignment storage
/// </summary>
public class LootAssignmentDataModel
{
    /// <summary>
    /// List of all loot assignments
    /// </summary>
    public List<LootAssignment> Assignments { get; set; } = new();
}

