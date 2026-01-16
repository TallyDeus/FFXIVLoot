using FFXIVLoot.Application.DTOs;
using FFXIVLoot.Application.Interfaces;
using FFXIVLoot.Domain.Interfaces;

namespace FFXIVLoot.Application.Services;

/// <summary>
/// Service for managing raid weeks
/// </summary>
public class WeekService : IWeekService
{
    private readonly IWeekRepository _weekRepository;

    /// <summary>
    /// Initializes a new instance of WeekService
    /// </summary>
    public WeekService(IWeekRepository weekRepository)
    {
        _weekRepository = weekRepository ?? throw new ArgumentNullException(nameof(weekRepository));
    }

    /// <summary>
    /// Gets the current active week
    /// </summary>
    public async Task<WeekDto?> GetCurrentWeekAsync()
    {
        var week = await _weekRepository.GetCurrentWeekAsync();
        if (week == null)
        {
            return null;
        }

        return new WeekDto
        {
            WeekNumber = week.WeekNumber,
            StartedAt = week.StartedAt,
            IsCurrent = week.IsCurrent
        };
    }

    /// <summary>
    /// Gets all weeks
    /// </summary>
    public async Task<List<WeekDto>> GetAllWeeksAsync()
    {
        var weeks = await _weekRepository.GetAllAsync();
        return weeks.Select(w => new WeekDto
        {
            WeekNumber = w.WeekNumber,
            StartedAt = w.StartedAt,
            IsCurrent = w.IsCurrent
        }).OrderByDescending(w => w.WeekNumber).ToList();
    }

    /// <summary>
    /// Starts a new week
    /// </summary>
    public async Task<WeekDto> StartNewWeekAsync()
    {
        var allWeeks = await _weekRepository.GetAllAsync();
        var maxWeekNumber = allWeeks.Any() ? allWeeks.Max(w => w.WeekNumber) : 0;
        var newWeekNumber = maxWeekNumber + 1;

        await _weekRepository.CreateWeekAsync(newWeekNumber);
        await _weekRepository.SetCurrentWeekAsync(newWeekNumber);

        var week = await _weekRepository.GetCurrentWeekAsync();
        if (week == null)
        {
            throw new InvalidOperationException("Failed to create new week");
        }

        return new WeekDto
        {
            WeekNumber = week.WeekNumber,
            StartedAt = week.StartedAt,
            IsCurrent = week.IsCurrent
        };
    }

    /// <summary>
    /// Sets a specific week as the current week
    /// </summary>
    public async Task SetCurrentWeekAsync(int weekNumber)
    {
        await _weekRepository.SetCurrentWeekAsync(weekNumber);
    }

    /// <summary>
    /// Creates a week with a specific week number
    /// </summary>
    public async Task<WeekDto> CreateWeekWithNumberAsync(int weekNumber)
    {
        var week = await _weekRepository.CreateWeekAsync(weekNumber);
        
        return new WeekDto
        {
            WeekNumber = week.WeekNumber,
            StartedAt = week.StartedAt,
            IsCurrent = week.IsCurrent
        };
    }

    /// <summary>
    /// Deletes a week by week number
    /// </summary>
    public async Task DeleteWeekAsync(int weekNumber)
    {
        await _weekRepository.DeleteWeekAsync(weekNumber);
    }
}

