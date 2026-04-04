namespace FFXIVLoot.Application.DTOs;

/// <summary>
/// Whether legacy JSON files still sit at the data root (outside raid-tiers/).
/// </summary>
public sealed class LegacyRootDataStatusDto
{
    public bool HasLegacyFiles { get; set; }

    public List<string> FileNames { get; set; } = new();
}
