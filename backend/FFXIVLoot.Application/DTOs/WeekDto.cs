namespace FFXIVLoot.Application.DTOs;

/// <summary>
/// Data transfer object for week information
/// </summary>
public class WeekDto
{
    /// <summary>
    /// Week number
    /// </summary>
    public int WeekNumber { get; set; }

    /// <summary>
    /// Timestamp when the week was started
    /// </summary>
    public DateTime StartedAt { get; set; }

    /// <summary>
    /// Whether this is the current active week
    /// </summary>
    public bool IsCurrent { get; set; }
}

/// <summary>
/// Data transfer object for loot assignment history
/// </summary>
public class LootAssignmentHistoryDto
{
    /// <summary>
    /// Assignment ID
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Week number
    /// </summary>
    public int WeekNumber { get; set; }

    /// <summary>
    /// Floor number
    /// </summary>
    public int FloorNumber { get; set; }

    /// <summary>
    /// Member ID
    /// </summary>
    public Guid MemberId { get; set; }

    /// <summary>
    /// Member name
    /// </summary>
    public string MemberName { get; set; } = string.Empty;

    /// <summary>
    /// Gear slot (null if upgrade material)
    /// </summary>
    public int? Slot { get; set; }

    /// <summary>
    /// Whether this is an upgrade material
    /// </summary>
    public bool IsUpgradeMaterial { get; set; }

    /// <summary>
    /// Whether this is an armor upgrade material
    /// </summary>
    public bool IsArmorMaterial { get; set; }

    /// <summary>
    /// Timestamp when assigned
    /// </summary>
    public DateTime AssignedAt { get; set; }

    /// <summary>
    /// Whether this assignment has been undone
    /// </summary>
    public bool IsUndone { get; set; }

    /// <summary>
    /// Whether this assignment was for main spec or off spec
    /// </summary>
    public int SpecType { get; set; }

    /// <summary>
    /// Whether this is a manual edit from the BiS tracker
    /// </summary>
    public bool IsManualEdit { get; set; }

    /// <summary>
    /// Item type (Raid or AugTome) - used for manual edits to determine correct tag display
    /// </summary>
    public int? ItemType { get; set; }
}

/// <summary>
/// Data transfer object for week assignment history
/// </summary>
public class WeekAssignmentHistoryDto
{
    /// <summary>
    /// Week number
    /// </summary>
    public int WeekNumber { get; set; }

    /// <summary>
    /// When the week was started
    /// </summary>
    public DateTime WeekStartedAt { get; set; }

    /// <summary>
    /// Whether this is the current week
    /// </summary>
    public bool IsCurrentWeek { get; set; }

    /// <summary>
    /// List of assignments for this week
    /// </summary>
    public List<LootAssignmentHistoryDto> Assignments { get; set; } = new();
}

