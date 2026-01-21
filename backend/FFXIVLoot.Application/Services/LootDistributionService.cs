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
    private readonly IUpdatesBroadcaster? _updatesBroadcaster;

    /// <summary>
    /// Initializes a new instance of LootDistributionService
    /// </summary>
    public LootDistributionService(
        IMemberRepository memberRepository,
        ILootAssignmentRepository assignmentRepository,
        IWeekRepository weekRepository,
        IUpdatesBroadcaster? updatesBroadcaster = null)
    {
        _memberRepository = memberRepository ?? throw new ArgumentNullException(nameof(memberRepository));
        _assignmentRepository = assignmentRepository ?? throw new ArgumentNullException(nameof(assignmentRepository));
        _weekRepository = weekRepository ?? throw new ArgumentNullException(nameof(weekRepository));
        _updatesBroadcaster = updatesBroadcaster;
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
    /// Returns main spec needs first, then off spec needs
    /// </summary>
    private static List<MemberNeedDto> GetEligibleMembersForSlot(List<Domain.Entities.Member> members, GearSlot slot)
    {
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

        var eligibleMembers = new List<MemberNeedDto>();
        eligibleMembers.AddRange(mainSpecMembers);
        eligibleMembers.AddRange(offSpecMembers);

        return eligibleMembers;
    }

    /// <summary>
    /// Gets eligible members who need upgrade materials and how many they need
    /// Returns main spec needs first, then off spec needs
    /// </summary>
    private static List<MemberNeedDto> GetEligibleMembersForUpgradeMaterial(List<Domain.Entities.Member> members, bool isArmorMaterial)
    {
        var relevantSlots = isArmorMaterial
            ? new[] { GearSlot.Head, GearSlot.Hand, GearSlot.Feet, GearSlot.Body, GearSlot.Legs }
            : new[] { GearSlot.Ears, GearSlot.Neck, GearSlot.Wrist, GearSlot.LeftRing, GearSlot.RightRing };

        var mainSpecMembers = new List<MemberNeedDto>();
        var offSpecMembers = new List<MemberNeedDto>();

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
                mainSpecMembers.Add(new MemberNeedDto
                {
                    MemberId = member.Id,
                    NeededCount = itemsNeedingUpgrade.Count,
                    SpecType = SpecType.MainSpec
                });
            }
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
                offSpecMembers.Add(new MemberNeedDto
                {
                    MemberId = member.Id,
                    NeededCount = itemsNeedingUpgrade.Count,
                    SpecType = SpecType.OffSpec
                });
            }
        }

        var eligibleMembers = new List<MemberNeedDto>();
        eligibleMembers.AddRange(mainSpecMembers);
        eligibleMembers.AddRange(offSpecMembers);

        return eligibleMembers;
    }

    /// <summary>
    /// Gets eligible members who need a ring (combines LeftRing and RightRing)
    /// Returns main spec needs first, then off spec needs
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

        var eligibleMembers = new List<MemberNeedDto>();
        eligibleMembers.AddRange(mainSpecMembers);
        eligibleMembers.AddRange(offSpecMembers);

        return eligibleMembers;
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

                // Broadcast BiS item update so BiS Tracker page updates in real-time
                if (_updatesBroadcaster != null)
                {
                    await _updatesBroadcaster.BroadcastBiSItemUpdateAsync(memberId, (int)actualSlot, true, (int)specType);
                }
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

        // Broadcast real-time update for loot distribution page
        if (_updatesBroadcaster != null)
        {
            await _updatesBroadcaster.BroadcastLootAssignedAsync((int)floorNumber, currentWeek.WeekNumber);
        }

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
                // Prioritize pieces that are already acquired so the upgrade material
                // is applied next to the owned tomestone piece (applies to both armor and accessory materials)
                // Additionally, for armor materials: prioritize body/legs over head/hand/feet when one piece from each category is acquired
                .OrderByDescending(item => item.IsAcquired)
                .ThenByDescending(item => GetArmorSlotPriority(item.Slot, item.IsAcquired, itemsList))
                .ThenBy(item => item.Slot)
                .ToList();

            if (!itemsToUpgrade.Any())
            {
                throw new InvalidOperationException($"No items found that need {(isArmorMaterial ? "armor" : "accessory")} upgrade material for member {memberId}");
            }

            var updatedSlot = itemsToUpgrade[0].Slot;
            itemsToUpgrade[0].UpgradeMaterialAcquired = true;
            
            MemberLinkStateHelper.UpdateLinkStateFromItem(member, specType, updatedSlot);
            await _memberRepository.UpdateAsync(member);

            // Broadcast upgrade material update so BiS Tracker page updates in real-time
            if (_updatesBroadcaster != null)
            {
                await _updatesBroadcaster.BroadcastUpgradeMaterialUpdateAsync(memberId, (int)updatedSlot, true, (int)specType);
            }
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

        // Broadcast real-time update for loot distribution page
        if (_updatesBroadcaster != null)
        {
            await _updatesBroadcaster.BroadcastLootAssignedAsync((int)floorNumber, currentWeek.WeekNumber);
        }

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
                await _memberRepository.UpdateAsync(member);

                // Broadcast upgrade material update so BiS Tracker page updates in real-time
                if (_updatesBroadcaster != null)
                {
                    await _updatesBroadcaster.BroadcastUpgradeMaterialUpdateAsync(assignment.MemberId, (int)upgradedItem.Slot, false, (int)assignment.SpecType);
                }
            }
        }
        else if (assignment.Slot.HasValue)
        {
            var item = itemsList.FirstOrDefault(i => i.Slot == assignment.Slot.Value);
            if (item != null)
            {
                item.IsAcquired = false;
                await _memberRepository.UpdateAsync(member);

                // Broadcast BiS item update so BiS Tracker page updates in real-time
                if (_updatesBroadcaster != null)
                {
                    await _updatesBroadcaster.BroadcastBiSItemUpdateAsync(assignment.MemberId, (int)assignment.Slot.Value, false, (int)assignment.SpecType);
                }
            }
        }
        else
        {
            await _memberRepository.UpdateAsync(member);
        }

        assignment.IsUndone = true;
        await _assignmentRepository.UpdateAsync(assignment);

        // Broadcast real-time update for loot distribution page
        if (_updatesBroadcaster != null)
        {
            await _updatesBroadcaster.BroadcastLootUndoneAsync((int)assignment.FloorNumber, assignment.WeekNumber);
        }
    }

    /// <summary>
    /// Gets priority value for armor slot when assigning upgrade materials
    /// Prioritizes body/legs over head/hand/feet when one piece from each category is acquired
    /// </summary>
    private static int GetArmorSlotPriority(GearSlot slot, bool isAcquired, List<Domain.Entities.GearItem> allItems)
    {
        // Only applies to armor slots
        var bodyLegsSlots = new[] { GearSlot.Body, GearSlot.Legs };
        var headHandFeetSlots = new[] { GearSlot.Head, GearSlot.Hand, GearSlot.Feet };

        if (!bodyLegsSlots.Contains(slot) && !headHandFeetSlots.Contains(slot))
        {
            return 0; // Not an armor slot, no priority
        }

        // Check if there's at least one acquired item in each category
        var hasAcquiredBodyLegs = allItems.Any(item => 
            bodyLegsSlots.Contains(item.Slot) && 
            item.ItemType == ItemType.AugTome && 
            item.IsAcquired);
        
        var hasAcquiredHeadHandFeet = allItems.Any(item => 
            headHandFeetSlots.Contains(item.Slot) && 
            item.ItemType == ItemType.AugTome && 
            item.IsAcquired);

        // If both categories have acquired items, prioritize body/legs
        if (hasAcquiredBodyLegs && hasAcquiredHeadHandFeet)
        {
            if (bodyLegsSlots.Contains(slot))
            {
                return 2; // Higher priority for body/legs
            }
            else
            {
                return 1; // Lower priority for head/hand/feet
            }
        }

        // Otherwise, no special priority
        return 0;
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

