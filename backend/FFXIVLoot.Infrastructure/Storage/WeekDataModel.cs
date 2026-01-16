using FFXIVLoot.Domain.Entities;

namespace FFXIVLoot.Infrastructure.Storage;

/// <summary>
/// Data model for week storage
/// </summary>
public class WeekDataModel
{
    /// <summary>
    /// List of all weeks
    /// </summary>
    public List<Week> Weeks { get; set; } = new();

    /// <summary>
    /// Current week number
    /// </summary>
    public int CurrentWeekNumber { get; set; } = 1;
}

