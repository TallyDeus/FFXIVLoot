namespace FFXIVLoot.Domain.Entities;

/// <summary>
/// Result of importing a BiS list from xivgear.
/// </summary>
public class XivGearImportResult
{
    public List<GearItem> GearItems { get; set; } = new();

    /// <summary>
    /// Job slug from the XivGear link or API (e.g. pld), when detected.
    /// </summary>
    public string? ImportedJobSlug { get; set; }
}
