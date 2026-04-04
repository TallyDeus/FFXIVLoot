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
        var members = await _memberRepository.GetAllAsync();
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

        if (!TryParseAvailability(dto.Status, out var status))
            throw new ArgumentException("Status must be yes, no, or maybe.", nameof(dto));

        var comment = string.IsNullOrWhiteSpace(dto.Comment) ? null : dto.Comment.Trim();
        if (status == ScheduleAvailability.Yes)
            comment = null;

        var existing = file.Responses.Find(r => r.MemberId == targetMemberId && r.Date == dto.Date);
        if (existing != null)
        {
            existing.Status = status;
            existing.Comment = comment;
        }
        else
        {
            file.Responses.Add(new ScheduleResponseEntry
            {
                MemberId = targetMemberId,
                Date = dto.Date,
                Status = status,
                Comment = comment
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

        if (!TryParseAvailability(dto.Status, out var status))
            throw new ArgumentException("Status must be yes, no, or maybe.", nameof(dto));

        var file = await _scheduleRepository.LoadAsync(cancellationToken) ?? new ScheduleFileData();
        NormalizeFile(file);

        for (var i = 0; i < 7; i++)
        {
            var date = weekMon.AddDays(i);
            var dateStr = date.ToString("yyyy-MM-dd");

            var existingRow = file.Responses.Find(r => r.MemberId == targetMemberId && r.Date == dateStr);

            string? comment = null;
            if (status != ScheduleAvailability.Yes && existingRow != null && !string.IsNullOrWhiteSpace(existingRow.Comment))
                comment = existingRow.Comment.Trim();

            if (existingRow != null)
            {
                existingRow.Status = status;
                existingRow.Comment = comment;
            }
            else
            {
                file.Responses.Add(new ScheduleResponseEntry
                {
                    MemberId = targetMemberId,
                    Date = dateStr,
                    Status = status,
                    Comment = comment
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
                var statuses = new List<ScheduleAvailability>();
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

        var memberRows = new List<ScheduleMemberRowDto>();
        foreach (var m in members)
        {
            var cells = new Dictionary<string, ScheduleCellDto>();
            foreach (var date in allDates)
            {
                var dateStr = date.ToString("yyyy-MM-dd");
                responseIndex.TryGetValue((m.Id, dateStr), out var entry);
                var effective = GetEffectiveAvailability(date, standardSet, entry);
                cells[dateStr] = new ScheduleCellDto
                {
                    Status = AvailabilityToApiString(effective),
                    Comment = entry != null && !string.IsNullOrWhiteSpace(entry.Comment) ? entry.Comment : null
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

        return new ScheduleViewDto
        {
            ViewStartMonday = viewStartMonday.ToString("yyyy-MM-dd"),
            StandardRaidDaysOfWeek = file.StandardRaidDaysOfWeek.Select(d => (int)d).ToList(),
            Weeks = weeks,
            Members = memberRows
        };
    }

    /// <summary>
    /// Stored response wins; otherwise standard raid weekday → Yes, else No.
    /// </summary>
    private static ScheduleAvailability GetEffectiveAvailability(
        DateOnly date,
        HashSet<DayOfWeek> standardSet,
        ScheduleResponseEntry? entry)
    {
        if (entry != null)
            return entry.Status;
        return standardSet.Contains(date.DayOfWeek)
            ? ScheduleAvailability.Yes
            : ScheduleAvailability.No;
    }

    /// <summary>
    /// Any No → not raiding; else any Maybe → maybe; else all Yes → raiding; else incomplete.
    /// </summary>
    private static string ComputeConsensus(IReadOnlyList<ScheduleAvailability> statuses)
    {
        if (statuses.Count == 0)
            return ScheduleConsensusValues.Incomplete;

        if (statuses.Any(s => s == ScheduleAvailability.No))
            return ScheduleConsensusValues.NotRaiding;

        if (statuses.Any(s => s == ScheduleAvailability.Maybe))
            return ScheduleConsensusValues.MaybeRaiding;

        if (statuses.All(s => s == ScheduleAvailability.Yes))
            return ScheduleConsensusValues.Raiding;

        return ScheduleConsensusValues.Incomplete;
    }

    private static string? AvailabilityToApiString(ScheduleAvailability s) =>
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
}
