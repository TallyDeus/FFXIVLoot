using FFXIVLoot.Application.DTOs;
using FFXIVLoot.Application.Interfaces;
using FFXIVLoot.Domain.Interfaces;

namespace FFXIVLoot.Application.Services;

/// <summary>
/// Service for retrieving loot assignment history
/// </summary>
public class LootHistoryService : ILootHistoryService
{
    private readonly ILootAssignmentRepository _assignmentRepository;
    private readonly IMemberRepository _memberRepository;
    private readonly IWeekRepository _weekRepository;

    /// <summary>
    /// Initializes a new instance of LootHistoryService
    /// </summary>
    public LootHistoryService(
        ILootAssignmentRepository assignmentRepository,
        IMemberRepository memberRepository,
        IWeekRepository weekRepository)
    {
        _assignmentRepository = assignmentRepository ?? throw new ArgumentNullException(nameof(assignmentRepository));
        _memberRepository = memberRepository ?? throw new ArgumentNullException(nameof(memberRepository));
        _weekRepository = weekRepository ?? throw new ArgumentNullException(nameof(weekRepository));
    }

    /// <summary>
    /// Gets all assignment history grouped by week
    /// </summary>
    public async Task<List<DTOs.WeekAssignmentHistoryDto>> GetAllHistoryGroupedByWeekAsync()
    {
        var allAssignments = await _assignmentRepository.GetAllAsync();
        var members = await _memberRepository.GetAllAsync();
        var weeks = await _weekRepository.GetAllAsync();

        var memberMap = members.ToDictionary(m => m.Id, m => m.Name);
        var weekMap = weeks.ToDictionary(w => w.WeekNumber, w => w);

        var groupedByWeek = allAssignments
            .Where(a => !a.IsUndone)
            .GroupBy(a => a.WeekNumber)
            .OrderByDescending(g => g.Key)
            .Select(g => new DTOs.WeekAssignmentHistoryDto
            {
                WeekNumber = g.Key,
                WeekStartedAt = weekMap.ContainsKey(g.Key) ? weekMap[g.Key].StartedAt : DateTime.MinValue,
                IsCurrentWeek = weekMap.ContainsKey(g.Key) && weekMap[g.Key].IsCurrent,
                Assignments = g.Select(a => new DTOs.LootAssignmentHistoryDto
                {
                    Id = a.Id,
                    WeekNumber = a.WeekNumber,
                    FloorNumber = (int)a.FloorNumber,
                    MemberId = a.MemberId,
                    MemberName = memberMap.ContainsKey(a.MemberId) ? memberMap[a.MemberId] : "Unknown",
                    Slot = a.Slot.HasValue ? (int)a.Slot.Value : null,
                    IsUpgradeMaterial = a.IsUpgradeMaterial,
                    IsArmorMaterial = a.IsArmorMaterial,
                    AssignedAt = a.AssignedAt,
                    IsUndone = a.IsUndone,
                    SpecType = (int)a.SpecType,
                    IsManualEdit = a.IsManualEdit,
                    ItemType = a.ItemType.HasValue ? (int)a.ItemType.Value : null
                }).OrderBy(a => a.FloorNumber).ThenBy(a => a.AssignedAt).ToList()
            })
            .ToList();

        return groupedByWeek;
    }

    /// <summary>
    /// Gets assignment history for a specific week
    /// </summary>
    public async Task<DTOs.WeekAssignmentHistoryDto?> GetHistoryForWeekAsync(int weekNumber)
    {
        var assignments = await _assignmentRepository.GetByWeekAsync(weekNumber);
        var members = await _memberRepository.GetAllAsync();
        var week = (await _weekRepository.GetAllAsync()).FirstOrDefault(w => w.WeekNumber == weekNumber);

        if (week == null && assignments.Count == 0)
        {
            return null;
        }

        var memberMap = members.ToDictionary(m => m.Id, m => m.Name);

        return new DTOs.WeekAssignmentHistoryDto
        {
            WeekNumber = weekNumber,
            WeekStartedAt = week?.StartedAt ?? DateTime.MinValue,
            IsCurrentWeek = week?.IsCurrent ?? false,
            Assignments = assignments.Select(a => new DTOs.LootAssignmentHistoryDto
            {
                Id = a.Id,
                WeekNumber = a.WeekNumber,
                FloorNumber = (int)a.FloorNumber,
                MemberId = a.MemberId,
                MemberName = memberMap.ContainsKey(a.MemberId) ? memberMap[a.MemberId] : "Unknown",
                Slot = a.Slot.HasValue ? (int)a.Slot.Value : null,
                IsUpgradeMaterial = a.IsUpgradeMaterial,
                IsArmorMaterial = a.IsArmorMaterial,
                AssignedAt = a.AssignedAt,
                IsUndone = a.IsUndone,
                SpecType = (int)a.SpecType,
                IsManualEdit = a.IsManualEdit
            }).OrderBy(a => a.FloorNumber).ThenBy(a => a.AssignedAt).ToList()
        };
    }
}

