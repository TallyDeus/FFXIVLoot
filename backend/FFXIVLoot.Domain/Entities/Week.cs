namespace FFXIVLoot.Domain.Entities;

/// <summary>
/// Represents a raid week
/// </summary>
public class Week
{
    /// <summary>
    /// Week number (1, 2, 3, etc.)
    /// </summary>
    public int WeekNumber { get; set; }

    /// <summary>
    /// Timestamp when the week was started
    /// </summary>
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Whether this is the current active week
    /// </summary>
    public bool IsCurrent { get; set; }
}

