using FFXIVLoot.Domain.Entities;
using FFXIVLoot.Domain.Enums;
using FFXIVLoot.Domain.Interfaces;
using FFXIVLoot.Infrastructure.Storage;

namespace FFXIVLoot.Infrastructure.Repositories;

/// <summary>
/// JSON file-based repository for loot assignment data
/// </summary>
public class JsonLootAssignmentRepository : ILootAssignmentRepository
{
    private readonly JsonFileStorage _storage;
    private const string DefaultDataFilePath = "data/loot-assignments.json";

    /// <summary>
    /// Initializes a new instance of JsonLootAssignmentRepository
    /// </summary>
    public JsonLootAssignmentRepository(string? dataFilePath = null)
    {
        var filePath = dataFilePath ?? DefaultDataFilePath;
        _storage = new JsonFileStorage(filePath);
    }

    /// <summary>
    /// Gets all assignments
    /// </summary>
    public async Task<List<LootAssignment>> GetAllAsync()
    {
        var data = await _storage.ReadAsync<LootAssignmentDataModel>();
        return data?.Assignments ?? new List<LootAssignment>();
    }

    /// <summary>
    /// Gets assignments for a specific week
    /// </summary>
    public async Task<List<LootAssignment>> GetByWeekAsync(int weekNumber)
    {
        var allAssignments = await GetAllAsync();
        return allAssignments.Where(a => a.WeekNumber == weekNumber && !a.IsUndone).ToList();
    }

    /// <summary>
    /// Gets assignments for a specific floor and week
    /// </summary>
    public async Task<List<LootAssignment>> GetByFloorAndWeekAsync(FloorNumber floorNumber, int weekNumber)
    {
        var allAssignments = await GetAllAsync();
        return allAssignments
            .Where(a => a.WeekNumber == weekNumber && 
                       a.FloorNumber == floorNumber && 
                       !a.IsUndone)
            .ToList();
    }

    /// <summary>
    /// Gets an assignment by ID
    /// </summary>
    public async Task<LootAssignment?> GetByIdAsync(Guid id)
    {
        var allAssignments = await GetAllAsync();
        return allAssignments.FirstOrDefault(a => a.Id == id);
    }

    /// <summary>
    /// Creates a new assignment
    /// </summary>
    public async Task<LootAssignment> CreateAsync(LootAssignment assignment)
    {
        if (assignment == null)
        {
            throw new ArgumentNullException(nameof(assignment));
        }

        var data = await _storage.ReadAsync<LootAssignmentDataModel>() ?? new LootAssignmentDataModel();
        
        if (assignment.Id == Guid.Empty)
        {
            assignment.Id = Guid.NewGuid();
        }

        data.Assignments.Add(assignment);
        await _storage.WriteAsync(data);

        return assignment;
    }

    /// <summary>
    /// Updates an assignment
    /// </summary>
    public async Task<LootAssignment> UpdateAsync(LootAssignment assignment)
    {
        if (assignment == null)
        {
            throw new ArgumentNullException(nameof(assignment));
        }

        var data = await _storage.ReadAsync<LootAssignmentDataModel>() ?? new LootAssignmentDataModel();
        var existingAssignment = data.Assignments.FirstOrDefault(a => a.Id == assignment.Id);
        
        if (existingAssignment == null)
        {
            throw new InvalidOperationException($"Assignment with ID {assignment.Id} not found");
        }

        var index = data.Assignments.IndexOf(existingAssignment);
        data.Assignments[index] = assignment;
        
        await _storage.WriteAsync(data);

        return assignment;
    }

    /// <summary>
    /// Checks if a slot/upgrade material is already assigned for a floor in a specific week
    /// </summary>
    public async Task<LootAssignment?> GetAssignmentForWeekAsync(FloorNumber floorNumber, int weekNumber, GearSlot? slot, bool isUpgradeMaterial, bool isArmorMaterial)
    {
        var allAssignments = await GetAllAsync();
        
        return allAssignments.FirstOrDefault(a => 
            a.WeekNumber == weekNumber &&
            a.FloorNumber == floorNumber &&
            a.IsUpgradeMaterial == isUpgradeMaterial &&
            !a.IsUndone &&
                ((isUpgradeMaterial && a.IsArmorMaterial == isArmorMaterial) || 
             (!isUpgradeMaterial && a.Slot == slot)));
    }

    /// <summary>
    /// Deletes all assignments for a specific week
    /// </summary>
    public async Task DeleteByWeekAsync(int weekNumber)
    {
        var data = await _storage.ReadAsync<LootAssignmentDataModel>() ?? new LootAssignmentDataModel();
        data.Assignments.RemoveAll(a => a.WeekNumber == weekNumber);
        await _storage.WriteAsync(data);
    }
}

