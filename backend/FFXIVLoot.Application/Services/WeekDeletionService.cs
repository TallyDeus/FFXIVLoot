using FFXIVLoot.Application.Helpers;
using FFXIVLoot.Application.Interfaces;
using FFXIVLoot.Domain.Interfaces;
using FFXIVLoot.Domain.Enums;

namespace FFXIVLoot.Application.Services;

/// <summary>
/// Service for handling week deletion and BiS tracker reversion
/// </summary>
public class WeekDeletionService : IWeekDeletionService
{
    private readonly IWeekRepository _weekRepository;
    private readonly ILootAssignmentRepository _assignmentRepository;
    private readonly IMemberRepository _memberRepository;

    /// <summary>
    /// Initializes a new instance of WeekDeletionService
    /// </summary>
    public WeekDeletionService(
        IWeekRepository weekRepository,
        ILootAssignmentRepository assignmentRepository,
        IMemberRepository memberRepository)
    {
        _weekRepository = weekRepository ?? throw new ArgumentNullException(nameof(weekRepository));
        _assignmentRepository = assignmentRepository ?? throw new ArgumentNullException(nameof(assignmentRepository));
        _memberRepository = memberRepository ?? throw new ArgumentNullException(nameof(memberRepository));
    }

    /// <summary>
    /// Deletes a week and reverts all BiS tracker changes from that week
    /// </summary>
    public async Task DeleteWeekAndRevertBiSAsync(int weekNumber)
    {
        // Get all assignments for this week
        var assignments = await _assignmentRepository.GetByWeekAsync(weekNumber);
        
        // Revert BiS tracker changes for each assignment
        foreach (var assignment in assignments)
        {
            var member = await _memberRepository.GetByIdAsync(assignment.MemberId);
            if (member == null)
            {
                continue;
            }

            var itemsList = MemberLinkStateHelper.GetBisItems(member, assignment.SpecType);

            // Revert BiS tracker changes
            if (assignment.IsUpgradeMaterial)
            {
                // Find and revert upgrade material
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
                // Revert gear item acquisition
                var item = itemsList.FirstOrDefault(i => i.Slot == assignment.Slot.Value);
                if (item != null)
                {
                    item.IsAcquired = false;
                }
            }

            await _memberRepository.UpdateAsync(member);
        }

        // Delete all assignments for this week
        await _assignmentRepository.DeleteByWeekAsync(weekNumber);

        // Delete the week
        await _weekRepository.DeleteWeekAsync(weekNumber);
    }
}

