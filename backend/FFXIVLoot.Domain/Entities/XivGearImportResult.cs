namespace FFXIVLoot.Domain.Entities;

/// <summary>
/// Result of importing a BiS list from xivgear.
/// </summary>
public class XivGearImportResult
{
    public List<GearItem> GearItems { get; set; } = new();
}
