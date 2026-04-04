using FFXIVLoot.Application.Interfaces;
using FFXIVLoot.Domain.Entities;
using FFXIVLoot.Domain.Interfaces;
using FFXIVLoot.Infrastructure.Storage;

namespace FFXIVLoot.Infrastructure.Repositories;

/// <summary>
/// JSON file-based repository for week data
/// </summary>
public class JsonWeekRepository : IWeekRepository
{
    private readonly IRaidTierManagement _raidTierManagement;

    /// <summary>
    /// Initializes a new instance of JsonWeekRepository
    /// </summary>
    public JsonWeekRepository(IRaidTierManagement raidTierManagement)
    {
        _raidTierManagement = raidTierManagement ?? throw new ArgumentNullException(nameof(raidTierManagement));
    }

    private async Task<JsonFileStorage> StorageAsync()
    {
        var tierId = await _raidTierManagement.GetCurrentTierIdAsync();
        var path = Path.Combine(_raidTierManagement.DataRoot, "raid-tiers", tierId.ToString(), "weeks.json");
        return new JsonFileStorage(path);
    }

    /// <summary>
    /// Gets all weeks
    /// </summary>
    public async Task<List<Week>> GetAllAsync()
    {
        var storage = await StorageAsync();
        var data = await storage.ReadAsync<WeekDataModel>();
        return data?.Weeks ?? new List<Week>();
    }

    /// <summary>
    /// Gets the current active week
    /// </summary>
    public async Task<Week?> GetCurrentWeekAsync()
    {
        var storage = await StorageAsync();
        var data = await storage.ReadAsync<WeekDataModel>();
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
        var storage = await StorageAsync();
        var data = await storage.ReadAsync<WeekDataModel>() ?? new WeekDataModel();
        
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
        await storage.WriteAsync(data);

        return week;
    }

    /// <summary>
    /// Sets a week as the current active week
    /// </summary>
    public async Task SetCurrentWeekAsync(int weekNumber)
    {
        var storage = await StorageAsync();
        var data = await storage.ReadAsync<WeekDataModel>() ?? new WeekDataModel();
        
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

        foreach (var w in data.Weeks)
        {
            w.IsCurrent = false;
        }

        week.IsCurrent = true;
        data.CurrentWeekNumber = weekNumber;

        await storage.WriteAsync(data);
    }

    /// <summary>
    /// Deletes a week by week number
    /// </summary>
    public async Task DeleteWeekAsync(int weekNumber)
    {
        var storage = await StorageAsync();
        var data = await storage.ReadAsync<WeekDataModel>() ?? new WeekDataModel();
        
        var weekToDelete = data.Weeks.FirstOrDefault(w => w.WeekNumber == weekNumber);
        if (weekToDelete == null)
        {
            throw new InvalidOperationException($"Week {weekNumber} not found");
        }

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
        await storage.WriteAsync(data);
    }
}

