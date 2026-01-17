using FFXIVLoot.Application.DTOs;
using FFXIVLoot.Application.Helpers;
using FFXIVLoot.Application.Interfaces;
using FFXIVLoot.Domain.Enums;
using FFXIVLoot.Domain.Interfaces;

namespace FFXIVLoot.Application.Services;

/// <summary>
/// Service for managing loot distribution
/// </summary>
public class LootDistributionService : ILootDistributionService
{
    private readonly IMemberRepository _memberRepository;
    private readonly ILootAssignmentRepository _assignmentRepository;
    private readonly IWeekRepository _weekRepository;

    /// <summary>
    /// Initializes a new instance of LootDistributionService
    /// </summary>
    public LootDistributionService(
        IMemberRepository memberRepository,
        ILootAssignmentRepository assignmentRepository,
        IWeekRepository weekRepository)
    {
        _memberRepository = memberRepository ?? throw new ArgumentNullException(nameof(memberRepository));
        _assignmentRepository = assignmentRepository ?? throw new ArgumentNullException(nameof(assignmentRepository));
        _weekRepository = weekRepository ?? throw new ArgumentNullException(nameof(weekRepository));
    }

    /// <summary>
    /// Gets available loot for a specific floor and members who need each piece
    /// </summary>
    public async Task<List<AvailableLootDto>> GetAvailableLootAndEligibleMembersAsync(FloorNumber floorNumber, int? weekNumber = null)
    {
        var members = await _memberRepository.GetAllAsync() ?? new List<Domain.Entities.Member>();
        var floorSlots = GetFloorSlots(floorNumber);

        if (!weekNumber.HasValue)
        {
            var currentWeek = await _weekRepository.GetCurrentWeekAsync();
            weekNumber = currentWeek?.WeekNumber ?? 1;
        }

        var assignments = await _assignmentRepository.GetByFloorAndWeekAsync(floorNumber, weekNumber.Value) ?? new List<Domain.Entities.LootAssignment>();

        var availableLoot = new List<AvailableLootDto>();

        if (floorNumber == FloorNumber.Floor1)
        {
            foreach (var slot in new[] { GearSlot.Ears, GearSlot.Neck, GearSlot.Wrist })
            {
                var assignment = assignments.FirstOrDefault(a => !a.IsUpgradeMaterial && a.Slot == slot);
                var eligibleMembers = GetEligibleMembersForSlot(members, slot);
                
                if (!eligibleMembers.Any())
                {
                    eligibleMembers = members.Select(m => new MemberNeedDto
                    {
                        MemberId = m.Id,
                        NeededCount = 0, // Will be set by acquisition count
                        SpecType = SpecType.Extra
                    }).ToList();
                }
                
                availableLoot.Add(new AvailableLootDto
                {
                    Slot = slot,
                    IsUpgradeMaterial = false,
                    EligibleMembers = eligibleMembers,
                    IsAssigned = assignment != null,
                    AssignedToMemberId = assignment?.MemberId,
                    AssignmentId = assignment?.Id
                });
            }

            var ringEligibleMembers = GetEligibleMembersForRing(members);

            if (!ringEligibleMembers.Any())
            {
                ringEligibleMembers = members.Select(m => new MemberNeedDto
                {
                    MemberId = m.Id,
                    NeededCount = 0, // Will be set by acquisition count
                    SpecType = SpecType.Extra
                }).ToList();
            }

            var ringAssignment = assignments.FirstOrDefault(a => 
                !a.IsUpgradeMaterial && 
                (a.Slot == GearSlot.LeftRing || a.Slot == GearSlot.RightRing));

            availableLoot.Add(new AvailableLootDto
            {
                Slot = GearSlot.RightRing, // Special marker for "Ring" - we'll handle this in frontend
                IsUpgradeMaterial = false,
                EligibleMembers = ringEligibleMembers,
                IsAssigned = ringAssignment != null,
                AssignedToMemberId = ringAssignment?.MemberId,
                AssignmentId = ringAssignment?.Id
            });
        }
        else
        {
            foreach (var slot in floorSlots)
            {
                var assignment = assignments.FirstOrDefault(a => !a.IsUpgradeMaterial && a.Slot == slot);
                var eligibleMembers = GetEligibleMembersForSlot(members, slot);
                
                if (!eligibleMembers.Any())
                {
                    eligibleMembers = members.Select(m => new MemberNeedDto
                    {
                        MemberId = m.Id,
                        NeededCount = 0, // Will be set by acquisition count
                        SpecType = SpecType.Extra
                    }).ToList();
                }
                
                availableLoot.Add(new AvailableLootDto
                {
                    Slot = slot,
                    IsUpgradeMaterial = false,
                    EligibleMembers = eligibleMembers,
                    IsAssigned = assignment != null,
                    AssignedToMemberId = assignment?.MemberId,
                    AssignmentId = assignment?.Id
                });
            }

            if (floorNumber == FloorNumber.Floor2)
            {
                var accessoryUpgradeMembers = GetEligibleMembersForUpgradeMaterial(members, isArmorMaterial: false);
                
                if (!accessoryUpgradeMembers.Any())
                {
                    accessoryUpgradeMembers = members.Select(m => new MemberNeedDto
                    {
                        MemberId = m.Id,
                        NeededCount = 0, // Will be set by acquisition count
                        SpecType = SpecType.Extra
                    }).ToList();
                }
                
                var accessoryAssignment = assignments.FirstOrDefault(a => 
                    a.IsUpgradeMaterial && !a.IsArmorMaterial);
                
                availableLoot.Add(new AvailableLootDto
                {
                    Slot = null,
                    IsUpgradeMaterial = true,
                    IsArmorMaterial = false,
                    EligibleMembers = accessoryUpgradeMembers,
                    IsAssigned = accessoryAssignment != null,
                    AssignedToMemberId = accessoryAssignment?.MemberId,
                    AssignmentId = accessoryAssignment?.Id
                });
            }
            else if (floorNumber == FloorNumber.Floor3)
            {
                var armorUpgradeMembers = GetEligibleMembersForUpgradeMaterial(members, isArmorMaterial: true);
                
                if (!armorUpgradeMembers.Any())
                {
                    armorUpgradeMembers = members.Select(m => new MemberNeedDto
                    {
                        MemberId = m.Id,
                        NeededCount = 0, // Will be set by acquisition count
                        SpecType = SpecType.Extra
                    }).ToList();
                }
                
                var armorAssignment = assignments.FirstOrDefault(a => 
                    a.IsUpgradeMaterial && a.IsArmorMaterial);
                
                availableLoot.Add(new AvailableLootDto
                {
                    Slot = null,
                    IsUpgradeMaterial = true,
                    IsArmorMaterial = true,
                    EligibleMembers = armorUpgradeMembers,
                    IsAssigned = armorAssignment != null,
                    AssignedToMemberId = armorAssignment?.MemberId,
                    AssignmentId = armorAssignment?.Id
                });
            }
        }

        return availableLoot;
    }

    /// <summary>
    /// Gets eligible members who need Raid gear for a specific slot
    /// Checks main spec first, then off spec if no main spec needs it
    /// </summary>
    private static List<MemberNeedDto> GetEligibleMembersForSlot(List<Domain.Entities.Member> members, GearSlot slot)
    {
        var eligibleMembers = new List<MemberNeedDto>();

        var mainSpecMembers = members
            .Where(m => m.BisItems != null && m.BisItems.Count > 0)
            .Where(m => 
            {
                var slotItem = m.BisItems.FirstOrDefault(item => item.Slot == slot);
                return slotItem != null && 
                       slotItem.ItemType == ItemType.Raid && 
                       !slotItem.IsAcquired;
            })
            .Select(m => new MemberNeedDto
            {
                MemberId = m.Id,
                NeededCount = 1,
                SpecType = SpecType.MainSpec
            })
            .ToList();

        if (mainSpecMembers.Any())
        {
            return mainSpecMembers;
        }

        var offSpecMembers = members
            .Where(m => m.OffSpecBisItems != null && m.OffSpecBisItems.Count > 0)
            .Where(m => 
            {
                var slotItem = m.OffSpecBisItems.FirstOrDefault(item => item.Slot == slot);
                return slotItem != null && 
                       slotItem.ItemType == ItemType.Raid && 
                       !slotItem.IsAcquired;
            })
            .Select(m => new MemberNeedDto
            {
                MemberId = m.Id,
                NeededCount = 1,
                SpecType = SpecType.OffSpec
            })
            .ToList();

        return offSpecMembers;
    }

    /// <summary>
    /// Gets eligible members who need upgrade materials and how many they need
    /// Checks main spec first, then off spec if no main spec needs it
    /// </summary>
    private static List<MemberNeedDto> GetEligibleMembersForUpgradeMaterial(List<Domain.Entities.Member> members, bool isArmorMaterial)
    {
        var eligibleMembers = new List<MemberNeedDto>();

        var relevantSlots = isArmorMaterial
            ? new[] { GearSlot.Head, GearSlot.Hand, GearSlot.Feet, GearSlot.Body, GearSlot.Legs }
            : new[] { GearSlot.Ears, GearSlot.Neck, GearSlot.Wrist, GearSlot.LeftRing, GearSlot.RightRing };

        foreach (var member in members)
        {
            if (member.BisItems == null || member.BisItems.Count == 0)
                continue;

            var itemsNeedingUpgrade = member.BisItems
                .Where(item => item.ItemType == ItemType.AugTome && 
                               relevantSlots.Contains(item.Slot) && 
                               !item.UpgradeMaterialAcquired)
                .ToList();

            if (itemsNeedingUpgrade.Any())
            {
                eligibleMembers.Add(new MemberNeedDto
                {
                    MemberId = member.Id,
                    NeededCount = itemsNeedingUpgrade.Count,
                    SpecType = SpecType.MainSpec
                });
            }
        }

        if (eligibleMembers.Any())
        {
            return eligibleMembers;
        }

        foreach (var member in members)
        {
            if (member.OffSpecBisItems == null || member.OffSpecBisItems.Count == 0)
                continue;

            var itemsNeedingUpgrade = member.OffSpecBisItems
                .Where(item => item.ItemType == ItemType.AugTome && 
                               relevantSlots.Contains(item.Slot) && 
                               !item.UpgradeMaterialAcquired)
                .ToList();

            if (itemsNeedingUpgrade.Any())
            {
                eligibleMembers.Add(new MemberNeedDto
                {
                    MemberId = member.Id,
                    NeededCount = itemsNeedingUpgrade.Count,
                    SpecType = SpecType.OffSpec
                });
            }
        }

        return eligibleMembers;
    }

    /// <summary>
    /// Gets eligible members who need a ring (combines LeftRing and RightRing)
    /// Checks main spec first, then off spec if no main spec needs it
    /// </summary>
    private static List<MemberNeedDto> GetEligibleMembersForRing(List<Domain.Entities.Member> members)
    {
        var mainSpecMembers = members
            .Where(m => m.BisItems != null && m.BisItems.Count > 0)
            .Where(m => m.BisItems.Any(item => 
                (item.Slot == GearSlot.LeftRing || item.Slot == GearSlot.RightRing) &&
                item.ItemType == ItemType.Raid &&
                !item.IsAcquired))
            .Select(m => new MemberNeedDto
            {
                MemberId = m.Id,
                NeededCount = 1,
                SpecType = SpecType.MainSpec
            })
            .DistinctBy(m => m.MemberId)
            .ToList();

        if (mainSpecMembers.Any())
        {
            return mainSpecMembers;
        }

        var offSpecMembers = members
            .Where(m => m.OffSpecBisItems != null && m.OffSpecBisItems.Count > 0)
            .Where(m => m.OffSpecBisItems.Any(item => 
                (item.Slot == GearSlot.LeftRing || item.Slot == GearSlot.RightRing) &&
                item.ItemType == ItemType.Raid &&
                !item.IsAcquired))
            .Select(m => new MemberNeedDto
            {
                MemberId = m.Id,
                NeededCount = 1,
                SpecType = SpecType.OffSpec
            })
            .DistinctBy(m => m.MemberId)
            .ToList();

        return offSpecMembers;
    }

    /// <summary>
    /// Assigns a gear item to a member
    /// </summary>
    public async Task<Guid> AssignLootToMemberAsync(Guid memberId, GearSlot slot, FloorNumber floorNumber, SpecType specType = SpecType.MainSpec)
    {
        var member = await _memberRepository.GetByIdAsync(memberId);
        if (member == null)
        {
            throw new InvalidOperationException($"Member with ID {memberId} not found");
        }

        var currentWeek = await _weekRepository.GetCurrentWeekAsync();
        if (currentWeek == null)
        {
            throw new InvalidOperationException("No current week set. Please start a new week first.");
        }

        var existingAssignment = await _assignmentRepository.GetAssignmentForWeekAsync(
            floorNumber, currentWeek.WeekNumber, slot, false, false);
        if (existingAssignment != null)
        {
            throw new InvalidOperationException("This item has already been assigned this week.");
        }

        GearSlot actualSlot = slot;
        bool itemUpdated = false;

        if (specType != SpecType.Extra)
        {
            var itemsList = MemberLinkStateHelper.GetBisItems(member, specType);

            if (slot == GearSlot.RightRing)
            {
                var leftRingItem = itemsList.FirstOrDefault(i => 
                    i.Slot == GearSlot.LeftRing && 
                    i.ItemType == ItemType.Raid && 
                    !i.IsAcquired);
                
                if (leftRingItem != null)
                {
                    leftRingItem.IsAcquired = true;
                    actualSlot = GearSlot.LeftRing;
                    itemUpdated = true;
                }
                else
                {
                    var rightRingItem = itemsList.FirstOrDefault(i => 
                        i.Slot == GearSlot.RightRing && 
                        i.ItemType == ItemType.Raid && 
                        !i.IsAcquired);
                    
                    if (rightRingItem != null)
                    {
                        rightRingItem.IsAcquired = true;
                        actualSlot = GearSlot.RightRing;
                        itemUpdated = true;
                    }
                    else
                    {
                        throw new InvalidOperationException($"No ring item found for member {memberId} (spec: {specType})");
                    }
                }
            }
            else
            {
                var item = itemsList.FirstOrDefault(i => i.Slot == slot);
                if (item == null)
                {
                    throw new InvalidOperationException($"Gear item for slot {slot} not found for member {memberId} (spec: {specType})");
                }

                item.IsAcquired = true;
                itemUpdated = true;
            }

            if (itemUpdated)
            {
                MemberLinkStateHelper.UpdateLinkStateFromItem(member, specType, actualSlot);
                await _memberRepository.UpdateAsync(member);
            }
        }
        else
        {
            if (slot == GearSlot.RightRing)
            {
                actualSlot = GearSlot.RightRing;
            }
        }

        var assignment = new Domain.Entities.LootAssignment
        {
            WeekNumber = currentWeek.WeekNumber,
            FloorNumber = floorNumber,
            MemberId = memberId,
            Slot = actualSlot,
            IsUpgradeMaterial = false,
            SpecType = specType,
            AssignedAt = DateTime.UtcNow
        };

        await _assignmentRepository.CreateAsync(assignment);
        return assignment.Id;
    }

    /// <summary>
    /// Assigns an upgrade material to a member
    /// </summary>
    public async Task<Guid> AssignUpgradeMaterialAsync(Guid memberId, bool isArmorMaterial, FloorNumber floorNumber, SpecType specType = SpecType.MainSpec)
    {
        var member = await _memberRepository.GetByIdAsync(memberId);
        if (member == null)
        {
            throw new InvalidOperationException($"Member with ID {memberId} not found");
        }

        var currentWeek = await _weekRepository.GetCurrentWeekAsync();
        if (currentWeek == null)
        {
            throw new InvalidOperationException("No current week set. Please start a new week first.");
        }

        var existingAssignment = await _assignmentRepository.GetAssignmentForWeekAsync(
            floorNumber, currentWeek.WeekNumber, null, true, isArmorMaterial);
        if (existingAssignment != null)
        {
            throw new InvalidOperationException("This upgrade material has already been assigned this week.");
        }

        if (specType != SpecType.Extra)
        {
            var relevantSlots = isArmorMaterial
                ? new[] { GearSlot.Head, GearSlot.Hand, GearSlot.Feet, GearSlot.Body, GearSlot.Legs }
                : new[] { GearSlot.Ears, GearSlot.Neck, GearSlot.Wrist, GearSlot.LeftRing, GearSlot.RightRing };

            var itemsList = MemberLinkStateHelper.GetBisItems(member, specType);

            var itemsToUpgrade = itemsList
                .Where(item => item.ItemType == ItemType.AugTome && 
                               relevantSlots.Contains(item.Slot) && 
                               !item.UpgradeMaterialAcquired)
                .OrderBy(item => item.Slot)
                .ToList();

            if (!itemsToUpgrade.Any())
            {
                throw new InvalidOperationException($"No items found that need {(isArmorMaterial ? "armor" : "accessory")} upgrade material for member {memberId}");
            }

            var updatedSlot = itemsToUpgrade[0].Slot;
            itemsToUpgrade[0].UpgradeMaterialAcquired = true;
            
            MemberLinkStateHelper.UpdateLinkStateFromItem(member, specType, updatedSlot);
            await _memberRepository.UpdateAsync(member);
        }

        var assignment = new Domain.Entities.LootAssignment
        {
            WeekNumber = currentWeek.WeekNumber,
            FloorNumber = floorNumber,
            MemberId = memberId,
            Slot = null,
            IsUpgradeMaterial = true,
            IsArmorMaterial = isArmorMaterial,
            SpecType = specType,
            AssignedAt = DateTime.UtcNow
        };

        await _assignmentRepository.CreateAsync(assignment);
        return assignment.Id;
    }

    /// <summary>
    /// Undoes a loot assignment
    /// </summary>
    public async Task UndoAssignmentAsync(Guid assignmentId)
    {
        var assignment = await _assignmentRepository.GetByIdAsync(assignmentId);
        if (assignment == null)
        {
            throw new InvalidOperationException($"Assignment with ID {assignmentId} not found");
        }

        if (assignment.IsUndone)
        {
            throw new InvalidOperationException("This assignment has already been undone");
        }

        var member = await _memberRepository.GetByIdAsync(assignment.MemberId);
        if (member == null)
        {
            throw new InvalidOperationException($"Member with ID {assignment.MemberId} not found");
        }

        var itemsList = MemberLinkStateHelper.GetBisItems(member, assignment.SpecType);

        if (assignment.IsUpgradeMaterial)
        {
            var relevantSlots = assignment.IsArmorMaterial
                ? new[] { GearSlot.Head, GearSlot.Hand, GearSlot.Feet, GearSlot.Body, GearSlot.Legs }
                : new[] { GearSlot.Ears, GearSlot.Neck, GearSlot.Wrist, GearSlot.LeftRing, GearSlot.RightRing };

            var upgradedItem = itemsList
                .Where(item => item.ItemType == ItemType.AugTome &&
                               relevantSlots.Contains(item.Slot) &&
                               item.UpgradeMaterialAcquired)
                .OrderBy(item => item.Slot)
                .FirstOrDefault();

            if (upgradedItem != null)
            {
                upgradedItem.UpgradeMaterialAcquired = false;
            }
        }
        else if (assignment.Slot.HasValue)
        {
            var item = itemsList.FirstOrDefault(i => i.Slot == assignment.Slot.Value);
            if (item != null)
            {
                item.IsAcquired = false;
            }
        }

        await _memberRepository.UpdateAsync(member);

        assignment.IsUndone = true;
        await _assignmentRepository.UpdateAsync(assignment);
    }

    /// <summary>
    /// Gets the gear slots that drop from a specific floor
    /// </summary>
    private static List<GearSlot> GetFloorSlots(FloorNumber floorNumber)
    {
        return floorNumber switch
        {
            FloorNumber.Floor1 => new List<GearSlot> { GearSlot.Ears, GearSlot.Neck, GearSlot.Wrist, GearSlot.RightRing, GearSlot.LeftRing },
            FloorNumber.Floor2 => new List<GearSlot> { GearSlot.Head, GearSlot.Hand, GearSlot.Feet },
            FloorNumber.Floor3 => new List<GearSlot> { GearSlot.Body, GearSlot.Legs },
            FloorNumber.Floor4 => new List<GearSlot> { GearSlot.Weapon },
            _ => new List<GearSlot>()
        };
    }

    /// <summary>
    /// Gets acquisition counts for Extra loot (how many times each member has received this item as Extra)
    /// </summary>
    public async Task<Dictionary<Guid, int>> GetExtraLootAcquisitionCountsAsync(GearSlot? slot, bool isUpgradeMaterial, bool? isArmorMaterial)
    {
        var allAssignments = await _assignmentRepository.GetAllAsync() ?? new List<Domain.Entities.LootAssignment>();
        
        var extraAssignments = allAssignments
            .Where(a => a.SpecType == SpecType.Extra && !a.IsUndone);

        IEnumerable<Domain.Entities.LootAssignment> matchingAssignments;
        
        if (isUpgradeMaterial)
        {
            matchingAssignments = extraAssignments
                .Where(a => a.IsUpgradeMaterial && 
                           a.IsArmorMaterial == isArmorMaterial);
        }
        else if (slot.HasValue)
        {
            if (slot == GearSlot.RightRing)
            {
                matchingAssignments = extraAssignments
                    .Where(a => !a.IsUpgradeMaterial && 
                               (a.Slot == GearSlot.LeftRing || a.Slot == GearSlot.RightRing));
            }
            else
            {
                matchingAssignments = extraAssignments
                    .Where(a => !a.IsUpgradeMaterial && a.Slot == slot);
            }
        }
        else
        {
            return new Dictionary<Guid, int>();
        }

        // Count assignments per member
        var counts = matchingAssignments
            .GroupBy(a => a.MemberId)
            .ToDictionary(g => g.Key, g => g.Count());

        return counts;
    }
}

