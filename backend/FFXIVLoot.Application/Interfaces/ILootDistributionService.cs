using FFXIVLoot.Application.DTOs;
using FFXIVLoot.Domain.Enums;

namespace FFXIVLoot.Application.Interfaces;

/// <summary>
/// Service interface for managing loot distribution
/// </summary>
public interface ILootDistributionService
{
    /// <summary>
    /// Gets available loot for a specific floor and members who need each piece
    /// </summary>
    Task<List<AvailableLootDto>> GetAvailableLootAndEligibleMembersAsync(FloorNumber floorNumber, int? weekNumber = null);

    /// <summary>
    /// Assigns a gear item to a member
    /// </summary>
    Task<Guid> AssignLootToMemberAsync(Guid memberId, GearSlot slot, FloorNumber floorNumber, SpecType specType = SpecType.MainSpec);

    /// <summary>
    /// Assigns an upgrade material to a member
    /// </summary>
    Task<Guid> AssignUpgradeMaterialAsync(Guid memberId, bool isArmorMaterial, FloorNumber floorNumber, SpecType specType = SpecType.MainSpec);

    /// <summary>
    /// Undoes a loot assignment
    /// </summary>
    Task UndoAssignmentAsync(Guid assignmentId);

    /// <summary>
    /// Gets acquisition counts for Extra loot (how many times each member has received this item as Extra)
    /// </summary>
    Task<Dictionary<Guid, int>> GetExtraLootAcquisitionCountsAsync(GearSlot? slot, bool isUpgradeMaterial, bool? isArmorMaterial);
}

