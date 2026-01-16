using FFXIVLoot.Application.DTOs;

namespace FFXIVLoot.Application.Interfaces;

/// <summary>
/// Service interface for retrieving loot assignment history
/// </summary>
public interface ILootHistoryService
{
    /// <summary>
    /// Gets all assignment history grouped by week
    /// </summary>
    Task<List<WeekAssignmentHistoryDto>> GetAllHistoryGroupedByWeekAsync();

    /// <summary>
    /// Gets assignment history for a specific week
    /// </summary>
    Task<WeekAssignmentHistoryDto?> GetHistoryForWeekAsync(int weekNumber);
}

