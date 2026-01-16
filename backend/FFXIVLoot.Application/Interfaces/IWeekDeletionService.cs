namespace FFXIVLoot.Application.Interfaces;

/// <summary>
/// Service interface for handling week deletion and BiS tracker reversion
/// </summary>
public interface IWeekDeletionService
{
    /// <summary>
    /// Deletes a week and reverts all BiS tracker changes from that week
    /// </summary>
    Task DeleteWeekAndRevertBiSAsync(int weekNumber);
}

