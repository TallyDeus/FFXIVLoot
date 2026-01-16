using FFXIVLoot.Application.DTOs;
using FFXIVLoot.Application.Helpers;
using FFXIVLoot.Application.Interfaces;
using FFXIVLoot.Domain.Enums;
using FFXIVLoot.Domain.Interfaces;
using FFXIVLoot.Domain.Entities;

namespace FFXIVLoot.Application.Services;

/// <summary>
/// Service for managing best-in-slot lists
/// </summary>
public class BiSService : IBiSService
{
    private readonly IMemberRepository _memberRepository;
    private readonly IXivGearClient _xivGearClient;
    private readonly ILootAssignmentRepository _assignmentRepository;
    private readonly IWeekRepository _weekRepository;

    /// <summary>
    /// Initializes a new instance of BiSService
    /// </summary>
    public BiSService(IMemberRepository memberRepository, IXivGearClient xivGearClient, ILootAssignmentRepository assignmentRepository, IWeekRepository weekRepository)
    {
        _memberRepository = memberRepository ?? throw new ArgumentNullException(nameof(memberRepository));
        _xivGearClient = xivGearClient ?? throw new ArgumentNullException(nameof(xivGearClient));
        _assignmentRepository = assignmentRepository ?? throw new ArgumentNullException(nameof(assignmentRepository));
        _weekRepository = weekRepository ?? throw new ArgumentNullException(nameof(weekRepository));
    }

    /// <summary>
    /// Imports a best-in-slot list from a xivgear link
    /// </summary>
    public async Task<MemberDto> ImportBiSFromLinkAsync(XivGearImportRequest request)
    {
        var member = await _memberRepository.GetByIdAsync(request.MemberId);
        if (member == null)
        {
            throw new InvalidOperationException($"Member with ID {request.MemberId} not found");
        }

        // CRITICAL: Explicitly preserve the other spec's data before updating
        // Create deep copies to ensure we don't lose data
        var preservedMainSpecLink = member.XivGearLink;
        var preservedMainSpecItems = GearItemHelper.DeepCopyList(member.BisItems ?? new List<Domain.Entities.GearItem>());
        
        var preservedOffSpecLink = member.OffSpecXivGearLink;
        var preservedOffSpecItems = GearItemHelper.DeepCopyList(member.OffSpecBisItems ?? new List<Domain.Entities.GearItem>());

        // Import gear items from xivgear
        var gearItems = await _xivGearClient.ImportBiSFromLinkAsync(request.XivGearLink);

        // Restore acquisition state if this link was used before
        MemberLinkStateHelper.RestoreStateFromLink(member, request.SpecType, request.XivGearLink, gearItems);
        
        // Save current state to link states dictionary after import
        MemberLinkStateHelper.SaveCurrentStateToLink(member, request.SpecType, request.XivGearLink);

        // Update member with imported BiS and link based on spec type
        // CRITICAL: Only update the spec being imported, explicitly preserve the other spec's data
        if (request.SpecType == SpecType.OffSpec)
        {
            // Update off spec only - explicitly preserve main spec data
            member.OffSpecXivGearLink = request.XivGearLink;
            member.OffSpecBisItems = gearItems;
            // CRITICAL: Explicitly restore main spec data to prevent overwrite
            member.XivGearLink = preservedMainSpecLink;
            member.BisItems = preservedMainSpecItems;
            
        }
        else
        {
            // Update main spec only - explicitly preserve off spec data
            member.XivGearLink = request.XivGearLink;
            member.BisItems = gearItems;
            // CRITICAL: Explicitly restore off spec data to prevent overwrite
            member.OffSpecXivGearLink = preservedOffSpecLink;
            member.OffSpecBisItems = preservedOffSpecItems;
        }

        var updatedMember = await _memberRepository.UpdateAsync(member);
        
        return new MemberDto
        {
            Id = updatedMember.Id,
            Name = updatedMember.Name,
            Role = updatedMember.Role,
            XivGearLink = updatedMember.XivGearLink,
            BisItems = updatedMember.BisItems.Select(item => new GearItemDto
            {
                Id = item.Id,
                Slot = item.Slot,
                ItemName = item.ItemName,
                ItemType = item.ItemType,
                IsAcquired = item.IsAcquired,
                UpgradeMaterialAcquired = item.UpgradeMaterialAcquired
            }).ToList(),
            OffSpecXivGearLink = updatedMember.OffSpecXivGearLink,
            OffSpecBisItems = updatedMember.OffSpecBisItems.Select(item => new GearItemDto
            {
                Id = item.Id,
                Slot = item.Slot,
                ItemName = item.ItemName,
                ItemType = item.ItemType,
                IsAcquired = item.IsAcquired,
                UpgradeMaterialAcquired = item.UpgradeMaterialAcquired
            }).ToList()
        };
    }

    /// <summary>
    /// Marks a gear item as acquired for a member
    /// </summary>
    public async Task UpdateItemAcquisitionAsync(Guid memberId, GearSlot slot, bool isAcquired, SpecType specType = SpecType.MainSpec)
    {
        var member = await _memberRepository.GetByIdAsync(memberId);
        if (member == null)
        {
            throw new InvalidOperationException($"Member with ID {memberId} not found");
        }

        var itemsList = MemberLinkStateHelper.GetBisItems(member, specType);
        var item = itemsList.FirstOrDefault(i => i.Slot == slot);
        if (item == null)
        {
            throw new InvalidOperationException($"Gear item for slot {slot} not found for member {memberId} (spec: {specType})");
        }

        item.IsAcquired = isAcquired;
        
        // Update stored state for the current link
        var currentLink = MemberLinkStateHelper.GetCurrentLink(member, specType);
        if (!string.IsNullOrEmpty(currentLink))
        {
            var existingState = MemberLinkStateHelper.GetLinkStates(member, specType)
                .TryGetValue(currentLink, out var linkState) && linkState.TryGetValue(slot, out var state)
                ? state
                : (false, false);
            
            MemberLinkStateHelper.UpdateLinkState(member, specType, currentLink, slot, isAcquired, existingState.Item2);
        }
        
        // Handle manual edit history tracking
        var currentWeek = await _weekRepository.GetCurrentWeekAsync();
        if (currentWeek != null)
        {
            // Manual edits don't need a specific floor number - they appear under "Manual edits" category
            // FloorNumber is required by the entity, so we use Floor1 as a default (not used for grouping)
            
            if (isAcquired)
            {
                // Check if manual edit assignment already exists
                var existingManualEdit = await GetManualEditAssignmentAsync(memberId, slot, specType, currentWeek.WeekNumber);
                if (existingManualEdit == null)
                {
                    // Create manual edit assignment
                    var manualEdit = new Domain.Entities.LootAssignment
                    {
                        WeekNumber = currentWeek.WeekNumber,
                        FloorNumber = FloorNumber.Floor1, // Default value, not used for manual edits grouping
                        MemberId = memberId,
                        Slot = slot,
                        IsUpgradeMaterial = false,
                        SpecType = specType,
                        IsManualEdit = true,
                        ItemType = item.ItemType, // Store ItemType for correct tag display
                        AssignedAt = DateTime.UtcNow
                    };
                    await _assignmentRepository.CreateAsync(manualEdit);
                }
            }
            else
            {
                // Delete manual edit assignment if it exists
                var existingManualEdit = await GetManualEditAssignmentAsync(memberId, slot, specType, currentWeek.WeekNumber);
                if (existingManualEdit != null)
                {
                    existingManualEdit.IsUndone = true;
                    await _assignmentRepository.UpdateAsync(existingManualEdit);
                }
            }
        }
        
        await _memberRepository.UpdateAsync(member);
    }

    /// <summary>
    /// Marks an upgrade material as acquired for a member
    /// </summary>
    public async Task UpdateUpgradeMaterialAcquisitionAsync(Guid memberId, GearSlot slot, bool upgradeMaterialAcquired, SpecType specType = SpecType.MainSpec)
    {
        var member = await _memberRepository.GetByIdAsync(memberId);
        if (member == null)
        {
            throw new InvalidOperationException($"Member with ID {memberId} not found");
        }

        var itemsList = MemberLinkStateHelper.GetBisItems(member, specType);
        var item = itemsList.FirstOrDefault(i => i.Slot == slot);
        if (item == null)
        {
            throw new InvalidOperationException($"Gear item for slot {slot} not found for member {memberId} (spec: {specType})");
        }

        if (item.ItemType != ItemType.AugTome)
        {
            throw new InvalidOperationException($"Item in slot {slot} is not an augmented tome item");
        }

        item.UpgradeMaterialAcquired = upgradeMaterialAcquired;
        
        // Update stored state for the current link
        var currentLink = MemberLinkStateHelper.GetCurrentLink(member, specType);
        if (!string.IsNullOrEmpty(currentLink))
        {
            var existingState = MemberLinkStateHelper.GetLinkStates(member, specType)
                .TryGetValue(currentLink, out var linkState) && linkState.TryGetValue(slot, out var state)
                ? state
                : (false, false);
            
            MemberLinkStateHelper.UpdateLinkState(member, specType, currentLink, slot, existingState.Item1, upgradeMaterialAcquired);
        }
        
        // Handle manual edit history tracking for upgrade materials
        var currentWeek = await _weekRepository.GetCurrentWeekAsync();
        if (currentWeek != null)
        {
            // Determine material type based on slot (but not floor - manual edits don't use floor for grouping)
            // Accessory upgrade materials: Ears, Neck, Wrist, Rings
            // Armor upgrade materials: Head, Hand, Feet, Body, Legs
            var isArmorMaterial = slot is GearSlot.Head or GearSlot.Hand or GearSlot.Feet or GearSlot.Body or GearSlot.Legs;
            
            if (upgradeMaterialAcquired)
            {
                // Check if manual edit assignment already exists
                var existingManualEdit = await GetManualEditUpgradeAssignmentAsync(memberId, slot, specType, currentWeek.WeekNumber, isArmorMaterial);
                if (existingManualEdit == null)
                {
                    // Create manual edit assignment
                    var manualEdit = new Domain.Entities.LootAssignment
                    {
                        WeekNumber = currentWeek.WeekNumber,
                        FloorNumber = FloorNumber.Floor1, // Default value, not used for manual edits grouping
                        MemberId = memberId,
                        Slot = null,
                        IsUpgradeMaterial = true,
                        IsArmorMaterial = isArmorMaterial,
                        SpecType = specType,
                        IsManualEdit = true,
                        AssignedAt = DateTime.UtcNow
                    };
                    await _assignmentRepository.CreateAsync(manualEdit);
                }
            }
            else
            {
                // Delete manual edit assignment if it exists
                var existingManualEdit = await GetManualEditUpgradeAssignmentAsync(memberId, slot, specType, currentWeek.WeekNumber, isArmorMaterial);
                if (existingManualEdit != null)
                {
                    existingManualEdit.IsUndone = true;
                    await _assignmentRepository.UpdateAsync(existingManualEdit);
                }
            }
        }
        
        await _memberRepository.UpdateAsync(member);
    }

    /// <summary>
    /// Gets an existing manual edit assignment for a slot
    /// </summary>
    private async Task<Domain.Entities.LootAssignment?> GetManualEditAssignmentAsync(Guid memberId, GearSlot slot, SpecType specType, int weekNumber)
    {
        var allAssignments = await _assignmentRepository.GetAllAsync();
        return allAssignments.FirstOrDefault(a =>
            a.WeekNumber == weekNumber &&
            a.MemberId == memberId &&
            a.Slot == slot &&
            a.SpecType == specType &&
            a.IsManualEdit &&
            !a.IsUndone &&
            !a.IsUpgradeMaterial);
    }

    /// <summary>
    /// Gets an existing manual edit assignment for an upgrade material
    /// </summary>
    private async Task<Domain.Entities.LootAssignment?> GetManualEditUpgradeAssignmentAsync(Guid memberId, GearSlot slot, SpecType specType, int weekNumber, bool isArmorMaterial)
    {
        var allAssignments = await _assignmentRepository.GetAllAsync();
        // For manual edits, we match by member, slot context, spec type, and material type
        // Floor number is not used for matching manual edits
        return allAssignments.FirstOrDefault(a =>
            a.WeekNumber == weekNumber &&
            a.MemberId == memberId &&
            a.SpecType == specType &&
            a.IsManualEdit &&
            !a.IsUndone &&
            a.IsUpgradeMaterial &&
            a.IsArmorMaterial == isArmorMaterial);
    }
}

