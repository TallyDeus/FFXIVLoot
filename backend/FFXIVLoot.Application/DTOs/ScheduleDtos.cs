namespace FFXIVLoot.Application.DTOs;

/// <summary>Per-member availability for one calendar day.</summary>
public enum ScheduleAvailability
{
    Yes,
    No,
    Maybe
}

/// <summary>Aggregated raid intent for a day (all members answered).</summary>
public static class ScheduleConsensusValues
{
    public const string Raiding = "raiding";
    public const string MaybeRaiding = "maybeRaiding";
    public const string NotRaiding = "notRaiding";
    public const string Incomplete = "incomplete";
}

/// <summary>Persisted shape for schedule.json in each raid tier folder.</summary>
public class ScheduleFileData
{
    /// <summary>1 = initial; 2 = per-response <see cref="ScheduleResponseEntry.IsManuallyEdited"/>.</summary>
    public int SchemaVersion { get; set; } = 1;

    /// <summary>.NET <see cref="DayOfWeek"/> values (Sunday = 0).</summary>
    public List<DayOfWeek> StandardRaidDaysOfWeek { get; set; } = new();

    public List<ScheduleResponseEntry> Responses { get; set; } = new();

    /// <summary>Optional note for a member for an entire week (week keyed by Monday yyyy-MM-dd).</summary>
    public List<ScheduleWeekCommentEntry> WeekComments { get; set; } = new();
}

public class ScheduleWeekCommentEntry
{
    public Guid MemberId { get; set; }

    /// <summary>Monday of that week (yyyy-MM-dd).</summary>
    public string WeekStartMonday { get; set; } = string.Empty;

    public string? Comment { get; set; }
}

public class ScheduleResponseEntry
{
    public Guid MemberId { get; set; }

    /// <summary>Calendar date (yyyy-MM-dd).</summary>
    public string Date { get; set; } = string.Empty;

    public ScheduleAvailability Status { get; set; }

    public string? Comment { get; set; }

    /// <summary>
    /// When false, the row only mirrors the current default (standard raid day → yes, else no) and may be removed when standard raid days change.
    /// When true, the value was explicitly set (or is Maybe / has a per-day comment) and is kept when defaults change.
    /// </summary>
    public bool IsManuallyEdited { get; set; } = true;
}

public class ScheduleViewDto
{
    /// <summary>Monday (yyyy-MM-dd) of the first visible week.</summary>
    public string ViewStartMonday { get; set; } = string.Empty;

    public List<int> StandardRaidDaysOfWeek { get; set; } = new();

    public List<ScheduleWeekBlockDto> Weeks { get; set; } = new();

    public List<ScheduleMemberRowDto> Members { get; set; } = new();
}

public class ScheduleWeekBlockDto
{
    public string WeekStartMonday { get; set; } = string.Empty;

    public List<ScheduleDayHeaderDto> Days { get; set; } = new();
}

public class ScheduleDayHeaderDto
{
    public string Date { get; set; } = string.Empty;

    public string DayName { get; set; } = string.Empty;

    public int DayOfWeek { get; set; }

    public bool IsStandardRaidDay { get; set; }

    /// <summary>True if at least one member has a manual override for this calendar day.</summary>
    public bool HasManualOverride { get; set; }

    public string Consensus { get; set; } = ScheduleConsensusValues.Incomplete;
}

public class ScheduleMemberRowDto
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    /// <summary>Relative URL for profile image, if any.</summary>
    public string? ProfileImageUrl { get; set; }

    /// <summary>Key: yyyy-MM-dd.</summary>
    public Dictionary<string, ScheduleCellDto> CellsByDate { get; set; } = new();

    /// <summary>Key: week start Monday yyyy-MM-dd → week note text.</summary>
    public Dictionary<string, string?> WeekCommentsByWeekStart { get; set; } = new();
}

public class ScheduleCellDto
{
    /// <summary>yes | no | maybe — effective availability for display.</summary>
    public string? Status { get; set; }

    public string? Comment { get; set; }

    /// <summary>True when a stored response exists with <see cref="ScheduleResponseEntry.IsManuallyEdited"/> true.</summary>
    public bool IsManuallyEdited { get; set; }
}

public class ScheduleResponseUpsertDto
{
    public string Date { get; set; } = string.Empty;

    /// <summary>yes | no | maybe (case-insensitive).</summary>
    public string Status { get; set; } = string.Empty;

    public string? Comment { get; set; }

    /// <summary>When set, only managers/administrators may update another member's cell.</summary>
    public Guid? MemberId { get; set; }
}

/// <summary>Set the same availability for all seven days of a week for one member (single save).</summary>
public class ScheduleWeekResponseBulkUpsertDto
{
    /// <summary>Monday (yyyy-MM-dd) of the week.</summary>
    public string WeekStartMonday { get; set; } = string.Empty;

    /// <summary>yes | no | maybe (case-insensitive).</summary>
    public string Status { get; set; } = string.Empty;

    /// <summary>When set, only managers/administrators may update another member's row.</summary>
    public Guid? MemberId { get; set; }
}

public class ScheduleWeekCommentUpsertDto
{
    /// <summary>Monday (yyyy-MM-dd) of the week.</summary>
    public string WeekStartMonday { get; set; } = string.Empty;

    public string? Comment { get; set; }

    /// <summary>When set, only managers/administrators may update another member's week comment.</summary>
    public Guid? MemberId { get; set; }
}

public class ScheduleSettingsUpdateDto
{
    public List<int> StandardRaidDaysOfWeek { get; set; } = new();
}
