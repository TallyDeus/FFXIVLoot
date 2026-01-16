using FFXIVLoot.Domain.Entities;
using FFXIVLoot.Domain.Enums;

namespace FFXIVLoot.Domain.Interfaces;

/// <summary>
/// Repository interface for managing loot assignments
/// </summary>
public interface ILootAssignmentRepository
{
    /// <summary>
    /// Gets all assignments
    /// </summary>
    Task<List<LootAssignment>> GetAllAsync();

    /// <summary>
    /// Gets assignments for a specific week
    /// </summary>
    Task<List<LootAssignment>> GetByWeekAsync(int weekNumber);

    /// <summary>
    /// Gets assignments for a specific floor and week
    /// </summary>
    Task<List<LootAssignment>> GetByFloorAndWeekAsync(FloorNumber floorNumber, int weekNumber);

    /// <summary>
    /// Gets an assignment by ID
    /// </summary>
    Task<LootAssignment?> GetByIdAsync(Guid id);

    /// <summary>
    /// Creates a new assignment
    /// </summary>
    Task<LootAssignment> CreateAsync(LootAssignment assignment);

    /// <summary>
    /// Updates an assignment
    /// </summary>
    Task<LootAssignment> UpdateAsync(LootAssignment assignment);

    /// <summary>
    /// Checks if a slot/upgrade material is already assigned for a floor in a specific week
    /// </summary>
    Task<LootAssignment?> GetAssignmentForWeekAsync(FloorNumber floorNumber, int weekNumber, GearSlot? slot, bool isUpgradeMaterial, bool isArmorMaterial);

    /// <summary>
    /// Deletes all assignments for a specific week
    /// </summary>
    Task DeleteByWeekAsync(int weekNumber);
}

