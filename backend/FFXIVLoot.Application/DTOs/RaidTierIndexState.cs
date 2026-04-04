using FFXIVLoot.Domain.Entities;

namespace FFXIVLoot.Application.DTOs;

/// <summary>
/// Persisted manifest for raid tier storage (data/raid-tiers-index.json).
/// </summary>
public sealed class RaidTierIndexState
{
    public Guid CurrentRaidTierId { get; set; }

    public List<RaidTier> RaidTiers { get; set; } = new();
}
