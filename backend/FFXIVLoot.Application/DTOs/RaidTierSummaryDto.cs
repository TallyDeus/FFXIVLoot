namespace FFXIVLoot.Application.DTOs;

public sealed class RaidTierSummaryDto
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; }

    public bool IsCurrent { get; set; }
}
