using FFXIVLoot.Application.DTOs;

namespace FFXIVLoot.Application.Interfaces;

/// <summary>
/// Service interface for managing raid weeks
/// </summary>
public interface IWeekService
{
    /// <summary>
    /// Gets the current active week
    /// </summary>
    Task<WeekDto?> GetCurrentWeekAsync();

    /// <summary>
    /// Gets all weeks
    /// </summary>
    Task<List<WeekDto>> GetAllWeeksAsync();

    /// <summary>
    /// Starts a new week
    /// </summary>
    Task<WeekDto> StartNewWeekAsync();

    /// <summary>
    /// Sets a specific week as the current week
    /// </summary>
    Task SetCurrentWeekAsync(int weekNumber);

    /// <summary>
    /// Creates a week with a specific week number
    /// </summary>
    Task<WeekDto> CreateWeekWithNumberAsync(int weekNumber);
}

