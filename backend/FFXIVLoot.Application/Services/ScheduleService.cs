using FFXIVLoot.Application.DTOs;
using FFXIVLoot.Application.Interfaces;
using FFXIVLoot.Domain.Entities;
using FFXIVLoot.Domain.Enums;
using FFXIVLoot.Domain.Interfaces;

namespace FFXIVLoot.Application.Services;

/// <summary>Builds schedule views and persists availability per raid tier.</summary>
public sealed class ScheduleService : IScheduleService
{
    /// <summary>2 weeks before “current” through 10 weeks ahead (13 weeks total).</summary>
    private const int VisibleWeekCount = 13;

    private readonly IScheduleRepository _scheduleRepository;
    private readonly IMemberRepository _memberRepository;

    public ScheduleService(IScheduleRepository scheduleRepository, IMemberRepository memberRepository)
    {
        _scheduleRepository = scheduleRepository ?? throw new ArgumentNullException(nameof(scheduleRepository));
        _memberRepository = memberRepository ?? throw new ArgumentNullException(nameof(memberRepository));
    }

    public static DateOnly GetMondayOfWeek(DateOnly date)
    {
        return date.DayOfWeek switch
        {
            DayOfWeek.Monday => date,
            DayOfWeek.Tuesday => date.AddDays(-1),
            DayOfWeek.Wednesday => date.AddDays(-2),
            DayOfWeek.Thursday => date.AddDays(-3),
            DayOfWeek.Friday => date.AddDays(-4),
            DayOfWeek.Saturday => date.AddDays(-5),
            DayOfWeek.Sunday => date.AddDays(-6),
            _ => date
        };
    }

    public async Task<ScheduleViewDto> GetViewAsync(DateOnly viewStartMonday, CancellationToken cancellationToken = default)
    {
        viewStartMonday = GetMondayOfWeek(viewStartMonday);
        var file = await _scheduleRepository.LoadAsync(cancellationToken) ?? new ScheduleFileData();
        NormalizeFile(file);
        var members = (await _memberRepository.GetAllAsync() ?? new List<Member>())
            .Where(m => m.IsActive)
            .ToList();
        members.Sort((a, b) => string.Compare(a.Name, b.Name, StringComparison.OrdinalIgnoreCase));
        return BuildView(file, members, viewStartMonday);
    }

    public async Task<ScheduleViewDto> UpsertResponseAsync(
        Member currentUser,
        DateOnly viewStartMonday,
        ScheduleResponseUpsertDto dto,
        CancellationToken cancellationToken = default)
    {
        if (!DateOnly.TryParse(dto.Date, out var day))
            throw new ArgumentException("Invalid date (use yyyy-MM-dd).", nameof(dto));

        var targetMemberId = dto.MemberId ?? currentUser.Id;
        if (targetMemberId != currentUser.Id)
        {
            if (currentUser.PermissionRole != PermissionRole.Manager &&
                currentUser.PermissionRole != PermissionRole.Administrator)
            {
                throw new UnauthorizedAccessException("Only managers can edit another member's availability.");
            }
        }

        var memberExists = await _memberRepository.GetByIdAsync(targetMemberId);
        if (memberExists == null)
            throw new InvalidOperationException("Member not found.");

        var file = await _scheduleRepository.LoadAsync(cancellationToken) ?? new ScheduleFileData();
        NormalizeFile(file);

        var standardSet = new HashSet<DayOfWeek>(file.StandardRaidDaysOfWeek);

        if (IsClearStatus(dto.Status))
        {
            file.Responses.RemoveAll(r => r.MemberId == targetMemberId && r.Date == dto.Date);
            await _scheduleRepository.SaveAsync(file, cancellationToken);
            return await GetViewAsync(GetMondayOfWeek(viewStartMonday), cancellationToken);
        }

        if (!TryParseAvailability(dto.Status ?? string.Empty, out var status))
            throw new ArgumentException("Status must be yes, no, maybe, or unset to clear.", nameof(dto));

        var comment = string.IsNullOrWhiteSpace(dto.Comment) ? null : dto.Comment.Trim();
        if (status == ScheduleAvailability.Yes)
            comment = null;

        if (standardSet.Contains(day.DayOfWeek) && status == ScheduleAvailability.Yes && comment == null)
        {
            file.Responses.RemoveAll(r => r.MemberId == targetMemberId && r.Date == dto.Date);
            await _scheduleRepository.SaveAsync(file, cancellationToken);
            return await GetViewAsync(GetMondayOfWeek(viewStartMonday), cancellationToken);
        }

        var existing = file.Responses.Find(r => r.MemberId == targetMemberId && r.Date == dto.Date);
        if (existing != null)
        {
            existing.Status = status;
            existing.Comment = comment;
            existing.IsManuallyEdited = true;
        }
        else
        {
            file.Responses.Add(new ScheduleResponseEntry
            {
                MemberId = targetMemberId,
                Date = dto.Date,
                Status = status,
                Comment = comment,
                IsManuallyEdited = true
            });
        }

        await _scheduleRepository.SaveAsync(file, cancellationToken);

        return await GetViewAsync(GetMondayOfWeek(viewStartMonday), cancellationToken);
    }

    public async Task<ScheduleViewDto> UpsertWeekResponsesBulkAsync(
        Member currentUser,
        DateOnly viewStartMonday,
        ScheduleWeekResponseBulkUpsertDto dto,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.WeekStartMonday) || !DateOnly.TryParse(dto.WeekStartMonday, out var weekMon))
            throw new ArgumentException("Invalid week (use yyyy-MM-dd for the week's Monday).", nameof(dto));

        weekMon = GetMondayOfWeek(weekMon);

        var targetMemberId = dto.MemberId ?? currentUser.Id;
        if (targetMemberId != currentUser.Id)
        {
            if (currentUser.PermissionRole != PermissionRole.Manager &&
                currentUser.PermissionRole != PermissionRole.Administrator)
            {
                throw new UnauthorizedAccessException("Only managers can edit another member's availability.");
            }
        }

        var memberExists = await _memberRepository.GetByIdAsync(targetMemberId);
        if (memberExists == null)
            throw new InvalidOperationException("Member not found.");

        if (string.IsNullOrWhiteSpace(dto.Status) || !TryParseAvailability(dto.Status, out var status))
            throw new ArgumentException("Status must be yes, no, or maybe.", nameof(dto));

        var file = await _scheduleRepository.LoadAsync(cancellationToken) ?? new ScheduleFileData();
        NormalizeFile(file);

        var standardSet = new HashSet<DayOfWeek>(file.StandardRaidDaysOfWeek);

        for (var i = 0; i < 7; i++)
        {
            var date = weekMon.AddDays(i);
            var dateStr = date.ToString("yyyy-MM-dd");

            var existingRow = file.Responses.Find(r => r.MemberId == targetMemberId && r.Date == dateStr);

            string? comment = null;
            if (status != ScheduleAvailability.Yes && existingRow != null && !string.IsNullOrWhiteSpace(existingRow.Comment))
                comment = existingRow.Comment.Trim();

            var isStandard = standardSet.Contains(date.DayOfWeek);
            if (status == ScheduleAvailability.Yes && comment == null && isStandard)
            {
                if (existingRow != null)
                    file.Responses.Remove(existingRow);
                continue;
            }

            if (existingRow != null)
            {
                existingRow.Status = status;
                existingRow.Comment = comment;
                existingRow.IsManuallyEdited = true;
            }
            else
            {
                file.Responses.Add(new ScheduleResponseEntry
                {
                    MemberId = targetMemberId,
                    Date = dateStr,
                    Status = status,
                    Comment = comment,
                    IsManuallyEdited = true
                });
            }
        }

        await _scheduleRepository.SaveAsync(file, cancellationToken);

        return await GetViewAsync(GetMondayOfWeek(viewStartMonday), cancellationToken);
    }

    public async Task<ScheduleViewDto> UpdateStandardDaysAsync(
        Member currentUser,
        DateOnly viewStartMonday,
        ScheduleSettingsUpdateDto dto,
        CancellationToken cancellationToken = default)
    {
        if (currentUser.PermissionRole != PermissionRole.Manager &&
            currentUser.PermissionRole != PermissionRole.Administrator)
        {
            throw new UnauthorizedAccessException("Only managers and administrators can change standard raid days.");
        }

        var file = await _scheduleRepository.LoadAsync(cancellationToken) ?? new ScheduleFileData();
        NormalizeFile(file);

        file.StandardRaidDaysOfWeek = dto.StandardRaidDaysOfWeek
            .Distinct()
            .Where(v => v >= 0 && v <= 6)
            .Select(v => (DayOfWeek)v)
            .ToList();

        // Drop entries that only mirrored defaults; remaining rows keep their explicit values when defaults change.
        file.Responses.RemoveAll(r => !r.IsManuallyEdited);

        await _scheduleRepository.SaveAsync(file, cancellationToken);

        return await GetViewAsync(GetMondayOfWeek(viewStartMonday), cancellationToken);
    }

    public async Task<ScheduleViewDto> UpsertWeekCommentAsync(
        Member currentUser,
        DateOnly viewStartMonday,
        ScheduleWeekCommentUpsertDto dto,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.WeekStartMonday) || !DateOnly.TryParse(dto.WeekStartMonday, out var weekMon))
            throw new ArgumentException("Invalid week (use yyyy-MM-dd for the week's Monday).", nameof(dto));

        weekMon = GetMondayOfWeek(weekMon);
        var weekKey = weekMon.ToString("yyyy-MM-dd");

        var targetMemberId = dto.MemberId ?? currentUser.Id;
        if (targetMemberId != currentUser.Id)
        {
            if (currentUser.PermissionRole != PermissionRole.Manager &&
                currentUser.PermissionRole != PermissionRole.Administrator)
            {
                throw new UnauthorizedAccessException("Only managers can edit another member's schedule note.");
            }
        }

        var memberExists = await _memberRepository.GetByIdAsync(targetMemberId);
        if (memberExists == null)
            throw new InvalidOperationException("Member not found.");

        var file = await _scheduleRepository.LoadAsync(cancellationToken) ?? new ScheduleFileData();
        NormalizeFile(file);

        var text = string.IsNullOrWhiteSpace(dto.Comment) ? null : dto.Comment.Trim();

        var existing = file.WeekComments.Find(x => x.MemberId == targetMemberId && x.WeekStartMonday == weekKey);
        if (text == null)
        {
            if (existing != null)
                file.WeekComments.Remove(existing);
        }
        else if (existing != null)
        {
            existing.Comment = text;
        }
        else
        {
            file.WeekComments.Add(new ScheduleWeekCommentEntry
            {
                MemberId = targetMemberId,
                WeekStartMonday = weekKey,
                Comment = text
            });
        }

        await _scheduleRepository.SaveAsync(file, cancellationToken);

        return await GetViewAsync(GetMondayOfWeek(viewStartMonday), cancellationToken);
    }

    private static void NormalizeFile(ScheduleFileData file)
    {
        if (file.SchemaVersion < 1)
            file.SchemaVersion = 1;
        file.Responses ??= new List<ScheduleResponseEntry>();
        file.StandardRaidDaysOfWeek ??= new List<DayOfWeek>();
        file.WeekComments ??= new List<ScheduleWeekCommentEntry>();

        if (file.SchemaVersion < 2)
        {
            var standardSet = new HashSet<DayOfWeek>(file.StandardRaidDaysOfWeek);
            foreach (var r in file.Responses)
                r.IsManuallyEdited = IsManualOverrideLegacy(r, standardSet);
            file.SchemaVersion = 2;
        }

        if (file.SchemaVersion < 3)
        {
            var standardSet = new HashSet<DayOfWeek>(file.StandardRaidDaysOfWeek);
            file.Responses.RemoveAll(r =>
            {
                if (string.IsNullOrWhiteSpace(r.Date) || !DateOnly.TryParse(r.Date, out var date))
                    return false;
                if (standardSet.Contains(date.DayOfWeek))
                    return false;
                if (r.Status != ScheduleAvailability.No)
                    return false;
                if (!string.IsNullOrWhiteSpace(r.Comment))
                    return false;
                return !r.IsManuallyEdited;
            });
            foreach (var r in file.Responses)
                r.IsManuallyEdited = IsManualOverride(r, standardSet);
            file.SchemaVersion = 3;
        }
    }

    /// <summary>Pre–schema-3: standard → yes, else no.</summary>
    private static bool IsManualOverrideLegacy(ScheduleResponseEntry r, HashSet<DayOfWeek> standardSet)
    {
        if (string.IsNullOrWhiteSpace(r.Date) || !DateOnly.TryParse(r.Date, out var date))
            return true;
        if (r.Status == ScheduleAvailability.Maybe)
            return true;
        if (!string.IsNullOrWhiteSpace(r.Comment))
            return true;
        var def = standardSet.Contains(date.DayOfWeek) ? ScheduleAvailability.Yes : ScheduleAvailability.No;
        return r.Status != def;
    }

    /// <summary>
    /// True when this row should be treated as an explicit user override (kept when standard raid days change).
    /// </summary>
    private static bool IsManualOverride(ScheduleResponseEntry r, HashSet<DayOfWeek> standardSet)
    {
        if (string.IsNullOrWhiteSpace(r.Date) || !DateOnly.TryParse(r.Date, out var date))
            return true;
        if (r.Status == ScheduleAvailability.Maybe)
            return true;
        if (!string.IsNullOrWhiteSpace(r.Comment))
            return true;
        if (standardSet.Contains(date.DayOfWeek))
            return r.Status != ScheduleAvailability.Yes;
        return true;
    }

    private static ScheduleViewDto BuildView(ScheduleFileData file, List<Member> members, DateOnly viewStartMonday)
    {
        var standardSet = new HashSet<DayOfWeek>(file.StandardRaidDaysOfWeek);
        var responseIndex = new Dictionary<(Guid MemberId, string Date), ScheduleResponseEntry>();
        foreach (var r in file.Responses)
        {
            if (string.IsNullOrWhiteSpace(r.Date)) continue;
            responseIndex[(r.MemberId, r.Date)] = r;
        }

        var weekCommentIndex = new Dictionary<(Guid MemberId, string WeekStartMonday), ScheduleWeekCommentEntry>();
        foreach (var wc in file.WeekComments)
        {
            if (string.IsNullOrWhiteSpace(wc.WeekStartMonday)) continue;
            if (!DateOnly.TryParse(wc.WeekStartMonday, out var wMon)) continue;
            wMon = GetMondayOfWeek(wMon);
            var key = wMon.ToString("yyyy-MM-dd");
            weekCommentIndex[(wc.MemberId, key)] = wc;
        }

        var weeks = new List<ScheduleWeekBlockDto>();
        var allDates = new List<DateOnly>();

        for (var w = 0; w < VisibleWeekCount; w++)
        {
            var monday = viewStartMonday.AddDays(w * 7);
            var days = new List<ScheduleDayHeaderDto>();
            for (var d = 0; d < 7; d++)
            {
                var date = monday.AddDays(d);
                allDates.Add(date);
                var dateStr = date.ToString("yyyy-MM-dd");
                var statuses = new List<ScheduleAvailability?>();
                foreach (var m in members)
                {
                    responseIndex.TryGetValue((m.Id, dateStr), out var entry);
                    statuses.Add(GetEffectiveAvailability(date, standardSet, entry));
                }

                days.Add(new ScheduleDayHeaderDto
                {
                    Date = dateStr,
                    DayName = date.ToString("ddd"),
                    DayOfWeek = (int)date.DayOfWeek,
                    IsStandardRaidDay = standardSet.Contains(date.DayOfWeek),
                    Consensus = ComputeConsensus(statuses)
                });
            }

            weeks.Add(new ScheduleWeekBlockDto
            {
                WeekStartMonday = monday.ToString("yyyy-MM-dd"),
                Days = days
            });
        }

        var manualDates = new HashSet<string>(StringComparer.Ordinal);
        var memberRows = new List<ScheduleMemberRowDto>();
        foreach (var m in members)
        {
            var cells = new Dictionary<string, ScheduleCellDto>();
            foreach (var date in allDates)
            {
                var dateStr = date.ToString("yyyy-MM-dd");
                responseIndex.TryGetValue((m.Id, dateStr), out var entry);
                var effective = GetEffectiveAvailability(date, standardSet, entry);
                if (entry != null && entry.IsManuallyEdited)
                    manualDates.Add(dateStr);
                cells[dateStr] = new ScheduleCellDto
                {
                    Status = AvailabilityToApiString(effective),
                    Comment = entry != null && !string.IsNullOrWhiteSpace(entry.Comment) ? entry.Comment : null,
                    IsManuallyEdited = entry != null && entry.IsManuallyEdited
                };
            }

            var weekCommentsOut = new Dictionary<string, string?>();
            for (var w = 0; w < VisibleWeekCount; w++)
            {
                var monday = viewStartMonday.AddDays(w * 7);
                var monStr = monday.ToString("yyyy-MM-dd");
                if (weekCommentIndex.TryGetValue((m.Id, monStr), out var wce) &&
                    !string.IsNullOrWhiteSpace(wce.Comment))
                    weekCommentsOut[monStr] = wce.Comment;
            }

            memberRows.Add(new ScheduleMemberRowDto
            {
                Id = m.Id,
                Name = m.Name,
                ProfileImageUrl = m.ProfileImageUrl,
                CellsByDate = cells,
                WeekCommentsByWeekStart = weekCommentsOut
            });
        }

        foreach (var week in weeks)
        {
            foreach (var day in week.Days)
                day.HasManualOverride = manualDates.Contains(day.Date);
        }

        return new ScheduleViewDto
        {
            ViewStartMonday = viewStartMonday.ToString("yyyy-MM-dd"),
            StandardRaidDaysOfWeek = file.StandardRaidDaysOfWeek.Select(d => (int)d).ToList(),
            Weeks = weeks,
            Members = memberRows
        };
    }

    /// <summary>
    /// Stored response wins; otherwise standard raid weekday → Yes; else unset (null).
    /// </summary>
    private static ScheduleAvailability? GetEffectiveAvailability(
        DateOnly date,
        HashSet<DayOfWeek> standardSet,
        ScheduleResponseEntry? entry)
    {
        if (entry != null)
            return entry.Status;
        return standardSet.Contains(date.DayOfWeek)
            ? ScheduleAvailability.Yes
            : null;
    }

    /// <summary>
    /// Any unset → incomplete; any No → not raiding; else any Maybe → maybe; else all Yes → raiding; else incomplete.
    /// </summary>
    private static string ComputeConsensus(IReadOnlyList<ScheduleAvailability?> statuses)
    {
        if (statuses.Count == 0)
            return ScheduleConsensusValues.Incomplete;

        if (statuses.Any(s => s == null))
            return ScheduleConsensusValues.Incomplete;

        if (statuses.Any(s => s == ScheduleAvailability.No))
            return ScheduleConsensusValues.NotRaiding;

        if (statuses.Any(s => s == ScheduleAvailability.Maybe))
            return ScheduleConsensusValues.MaybeRaiding;

        if (statuses.All(s => s == ScheduleAvailability.Yes))
            return ScheduleConsensusValues.Raiding;

        return ScheduleConsensusValues.Incomplete;
    }

    private static string? AvailabilityToApiString(ScheduleAvailability? s) =>
        s switch
        {
            ScheduleAvailability.Yes => "yes",
            ScheduleAvailability.No => "no",
            ScheduleAvailability.Maybe => "maybe",
            _ => null
        };

    private static bool TryParseAvailability(string raw, out ScheduleAvailability status)
    {
        status = default;
        if (string.IsNullOrWhiteSpace(raw))
            return false;
        return Enum.TryParse(raw.Trim(), true, out status);
    }

    private static bool IsClearStatus(string? raw) =>
        string.IsNullOrWhiteSpace(raw) ||
        raw.Equals("unset", StringComparison.OrdinalIgnoreCase);
}
