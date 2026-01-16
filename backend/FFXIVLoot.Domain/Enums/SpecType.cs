namespace FFXIVLoot.Domain.Enums;

/// <summary>
/// Represents whether gear is for main spec, off spec, or extra
/// </summary>
public enum SpecType
{
    /// <summary>
    /// Main specialization
    /// </summary>
    MainSpec = 0,

    /// <summary>
    /// Off specialization
    /// </summary>
    OffSpec = 1,

    /// <summary>
    /// Extra loot - when all members have acquired everything they need
    /// </summary>
    Extra = 2
}

