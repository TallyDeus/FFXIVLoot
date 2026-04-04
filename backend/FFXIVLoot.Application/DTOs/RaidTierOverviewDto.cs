namespace FFXIVLoot.Application.DTOs;

/// <summary>
/// Raid tier summary plus on-disk stats for overview UI (no tier switch required).
/// </summary>
public sealed class RaidTierOverviewDto
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; }

    public bool IsCurrent { get; set; }

    /// <summary>Members in this tier (name order), for overview cards.</summary>
    public List<RaidTierMemberPreviewDto> Members { get; set; } = new();

    public int WeekCount { get; set; }

    /// <summary>Current week number from week data (0 if none).</summary>
    public int ActiveWeekNumber { get; set; }

    public int LootAssignmentCount { get; set; }

    /// <summary>Assignments that are not undone.</summary>
    public int ActiveLootAssignmentCount { get; set; }
}
