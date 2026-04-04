namespace FFXIVLoot.Domain.Entities;

/// <summary>
/// A logical raid season / tier: isolated members, BiS, weeks, and loot history.
/// </summary>
public class RaidTier
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Name { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
