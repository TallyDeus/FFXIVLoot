namespace FFXIVLoot.Application.Interfaces;

/// <summary>
/// Interface for broadcasting real-time updates to connected clients
/// </summary>
public interface IUpdatesBroadcaster
{
    /// <summary>
    /// Broadcasts that a member's BiS item acquisition status has changed
    /// </summary>
    Task BroadcastBiSItemUpdateAsync(Guid memberId, int slot, bool isAcquired, int specType);

    /// <summary>
    /// Broadcasts that a member's upgrade material acquisition status has changed
    /// </summary>
    Task BroadcastUpgradeMaterialUpdateAsync(Guid memberId, int slot, bool upgradeMaterialAcquired, int specType);

    /// <summary>
    /// Broadcasts that loot has been assigned
    /// </summary>
    Task BroadcastLootAssignedAsync(int floorNumber, int? weekNumber);

    /// <summary>
    /// Broadcasts that a loot assignment has been undone
    /// </summary>
    Task BroadcastLootUndoneAsync(int floorNumber, int? weekNumber);
}
