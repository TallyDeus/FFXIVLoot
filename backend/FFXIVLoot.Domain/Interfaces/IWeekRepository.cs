using FFXIVLoot.Domain.Entities;

namespace FFXIVLoot.Domain.Interfaces;

/// <summary>
/// Repository interface for managing weeks
/// </summary>
public interface IWeekRepository
{
    /// <summary>
    /// Gets all weeks
    /// </summary>
    Task<List<Week>> GetAllAsync();

    /// <summary>
    /// Gets the current active week
    /// </summary>
    Task<Week?> GetCurrentWeekAsync();

    /// <summary>
    /// Creates a new week
    /// </summary>
    Task<Week> CreateWeekAsync(int weekNumber);

    /// <summary>
    /// Sets a week as the current active week
    /// </summary>
    Task SetCurrentWeekAsync(int weekNumber);

    /// <summary>
    /// Deletes a week by week number
    /// </summary>
    Task DeleteWeekAsync(int weekNumber);
}

