namespace FFXIVLoot.Domain.Enums;

/// <summary>
/// Combat role category for a BiS set (main or off spec), inferred from job or set manually.
/// </summary>
public enum BisJobCategory
{
    Unknown = 0,
    Tank = 1,
    Healer = 2,
    DpsMelee = 3,
    DpsPhysRanged = 4,
    DpsCaster = 5
}
