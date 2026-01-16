using FFXIVLoot.Domain.Entities;
using FFXIVLoot.Domain.Enums;
using FFXIVLoot.Domain.Interfaces;

namespace FFXIVLoot.Infrastructure.Initialization;

/// <summary>
/// Initializes week and assignment data with historical records
/// </summary>
public class WeekDataInitializer
{
    private readonly IWeekRepository _weekRepository;
    private readonly ILootAssignmentRepository _assignmentRepository;
    private readonly IMemberRepository _memberRepository;

    /// <summary>
    /// Initializes a new instance of WeekDataInitializer
    /// </summary>
    public WeekDataInitializer(
        IWeekRepository weekRepository,
        ILootAssignmentRepository assignmentRepository,
        IMemberRepository memberRepository)
    {
        _weekRepository = weekRepository ?? throw new ArgumentNullException(nameof(weekRepository));
        _assignmentRepository = assignmentRepository ?? throw new ArgumentNullException(nameof(assignmentRepository));
        _memberRepository = memberRepository ?? throw new ArgumentNullException(nameof(memberRepository));
    }

    /// <summary>
    /// Initializes historical week and assignment data
    /// </summary>
    public async Task InitializeHistoricalDataAsync()
    {
        var existingWeeks = await _weekRepository.GetAllAsync();
        if (existingWeeks.Any())
        {
            return; // Already initialized
        }

        var members = await _memberRepository.GetAllAsync();
        var memberNameMap = members.ToDictionary(m => m.Name, m => m.Id, StringComparer.OrdinalIgnoreCase);

        // Create Week 1
        await _weekRepository.CreateWeekAsync(1);
        
        // Week 1 assignments
        var week1Assignments = new List<LootAssignment>
        {
            CreateAssignment(1, FloorNumber.Floor1, "Rami", GearSlot.Ears, memberNameMap),
            CreateAssignment(1, FloorNumber.Floor1, "Rami", GearSlot.Neck, memberNameMap),
            CreateAssignment(1, FloorNumber.Floor1, "Ryu", GearSlot.Wrist, memberNameMap),
            CreateAssignment(1, FloorNumber.Floor1, "Elodie", GearSlot.RightRing, memberNameMap), // Ring
            CreateAssignment(1, FloorNumber.Floor2, "Ryu", GearSlot.Head, memberNameMap),
            CreateAssignment(1, FloorNumber.Floor2, "Elodie", GearSlot.Hand, memberNameMap),
            CreateAssignment(1, FloorNumber.Floor2, "Ryu", GearSlot.Feet, memberNameMap),
            CreateAssignment(1, FloorNumber.Floor2, "Rami", null, memberNameMap, isUpgradeMaterial: true, isArmorMaterial: false) // Accessory upgrade
        };

        foreach (var assignment in week1Assignments)
        {
            if (assignment != null)
            {
                await _assignmentRepository.CreateAsync(assignment);
            }
        }

        // Create Week 2 (current week)
        await _weekRepository.CreateWeekAsync(2);
        await _weekRepository.SetCurrentWeekAsync(2);

        // Week 2 assignments
        var week2Assignments = new List<LootAssignment>
        {
            CreateAssignment(2, FloorNumber.Floor1, "Lob", GearSlot.Ears, memberNameMap),
            CreateAssignment(2, FloorNumber.Floor1, "Elodie", GearSlot.Neck, memberNameMap),
            CreateAssignment(2, FloorNumber.Floor1, "Illya", GearSlot.Wrist, memberNameMap),
            CreateAssignment(2, FloorNumber.Floor1, "Rami", GearSlot.RightRing, memberNameMap), // Ring
            CreateAssignment(2, FloorNumber.Floor2, "Rami", GearSlot.Head, memberNameMap),
            CreateAssignment(2, FloorNumber.Floor2, "Ryu", GearSlot.Hand, memberNameMap),
            CreateAssignment(2, FloorNumber.Floor2, "Sandro", GearSlot.Feet, memberNameMap),
            CreateAssignment(2, FloorNumber.Floor2, "Lob", null, memberNameMap, isUpgradeMaterial: true, isArmorMaterial: false) // Accessory upgrade
        };

        foreach (var assignment in week2Assignments)
        {
            if (assignment != null)
            {
                await _assignmentRepository.CreateAsync(assignment);
            }
        }
    }

    private LootAssignment? CreateAssignment(
        int weekNumber,
        FloorNumber floorNumber,
        string memberName,
        GearSlot? slot,
        Dictionary<string, Guid> memberNameMap,
        bool isUpgradeMaterial = false,
        bool isArmorMaterial = false)
    {
        if (!memberNameMap.TryGetValue(memberName, out var memberId))
        {
            return null; // Member not found, skip
        }

        return new LootAssignment
        {
            WeekNumber = weekNumber,
            FloorNumber = floorNumber,
            MemberId = memberId,
            Slot = slot,
            IsUpgradeMaterial = isUpgradeMaterial,
            IsArmorMaterial = isArmorMaterial,
            AssignedAt = DateTime.UtcNow.AddDays(-(3 - weekNumber) * 7) // Approximate dates
        };
    }
}

