using FFXIVLoot.Domain.Entities;
using FFXIVLoot.Domain.Interfaces;
using FFXIVLoot.Infrastructure.Storage;

namespace FFXIVLoot.Infrastructure.Repositories;

/// <summary>
/// JSON file-based repository for week data
/// </summary>
public class JsonWeekRepository : IWeekRepository
{
    private readonly JsonFileStorage _storage;
    private const string DefaultDataFilePath = "data/weeks.json";

    /// <summary>
    /// Initializes a new instance of JsonWeekRepository
    /// </summary>
    public JsonWeekRepository(string? dataFilePath = null)
    {
        var filePath = dataFilePath ?? DefaultDataFilePath;
        _storage = new JsonFileStorage(filePath);
    }

    /// <summary>
    /// Gets all weeks
    /// </summary>
    public async Task<List<Week>> GetAllAsync()
    {
        var data = await _storage.ReadAsync<WeekDataModel>();
        return data?.Weeks ?? new List<Week>();
    }

    /// <summary>
    /// Gets the current active week
    /// </summary>
    public async Task<Week?> GetCurrentWeekAsync()
    {
        var data = await _storage.ReadAsync<WeekDataModel>();
        if (data == null || data.Weeks.Count == 0)
        {
            return null;
        }

        return data.Weeks.FirstOrDefault(w => w.WeekNumber == data.CurrentWeekNumber) 
            ?? data.Weeks.OrderByDescending(w => w.WeekNumber).FirstOrDefault();
    }

    /// <summary>
    /// Creates a new week
    /// </summary>
    public async Task<Week> CreateWeekAsync(int weekNumber)
    {
        var data = await _storage.ReadAsync<WeekDataModel>() ?? new WeekDataModel();
        
        // Check if week already exists
        var existingWeek = data.Weeks.FirstOrDefault(w => w.WeekNumber == weekNumber);
        if (existingWeek != null)
        {
            throw new InvalidOperationException($"Week {weekNumber} already exists.");
        }

        var week = new Week
        {
            WeekNumber = weekNumber,
            StartedAt = DateTime.UtcNow,
            IsCurrent = false
        };

        data.Weeks.Add(week);
        await _storage.WriteAsync(data);

        return week;
    }

    /// <summary>
    /// Sets a week as the current active week
    /// </summary>
    public async Task SetCurrentWeekAsync(int weekNumber)
    {
        var data = await _storage.ReadAsync<WeekDataModel>() ?? new WeekDataModel();
        
        // Ensure week exists
        var week = data.Weeks.FirstOrDefault(w => w.WeekNumber == weekNumber);
        if (week == null)
        {
            week = new Week
            {
                WeekNumber = weekNumber,
                StartedAt = DateTime.UtcNow,
                IsCurrent = true
            };
            data.Weeks.Add(week);
        }

        // Set all weeks to not current
        foreach (var w in data.Weeks)
        {
            w.IsCurrent = false;
        }

        // Set the specified week as current
        week.IsCurrent = true;
        data.CurrentWeekNumber = weekNumber;

        await _storage.WriteAsync(data);
    }

    /// <summary>
    /// Deletes a week by week number
    /// </summary>
    public async Task DeleteWeekAsync(int weekNumber)
    {
        var data = await _storage.ReadAsync<WeekDataModel>() ?? new WeekDataModel();
        
        var weekToDelete = data.Weeks.FirstOrDefault(w => w.WeekNumber == weekNumber);
        if (weekToDelete == null)
        {
            throw new InvalidOperationException($"Week {weekNumber} not found");
        }

        // If deleting the current week, we need to set another week as current
        if (weekToDelete.IsCurrent)
        {
            var remainingWeeks = data.Weeks.Where(w => w.WeekNumber != weekNumber).OrderByDescending(w => w.WeekNumber).ToList();
            if (remainingWeeks.Any())
            {
                var newCurrentWeek = remainingWeeks.First();
                newCurrentWeek.IsCurrent = true;
                data.CurrentWeekNumber = newCurrentWeek.WeekNumber;
            }
            else
            {
                data.CurrentWeekNumber = 0;
            }
        }

        data.Weeks.Remove(weekToDelete);
        await _storage.WriteAsync(data);
    }
}

