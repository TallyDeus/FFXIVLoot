using FFXIVLoot.Application.Interfaces;
using FFXIVLoot.API.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace FFXIVLoot.API.Services;

/// <summary>
/// SignalR-based implementation for broadcasting real-time updates
/// </summary>
public class SignalRUpdatesBroadcaster : IUpdatesBroadcaster
{
    private readonly IHubContext<UpdatesHub> _hubContext;

    public SignalRUpdatesBroadcaster(IHubContext<UpdatesHub> hubContext)
    {
        _hubContext = hubContext ?? throw new ArgumentNullException(nameof(hubContext));
    }

    /// <summary>
    /// Broadcasts that a member's BiS item acquisition status has changed
    /// </summary>
    public async Task BroadcastBiSItemUpdateAsync(Guid memberId, int slot, bool isAcquired, int specType)
    {
        await _hubContext.Clients.All.SendAsync("BiSItemUpdated", new
        {
            memberId = memberId.ToString(),
            slot,
            isAcquired,
            specType
        });
    }

    /// <summary>
    /// Broadcasts that a member's upgrade material acquisition status has changed
    /// </summary>
    public async Task BroadcastUpgradeMaterialUpdateAsync(Guid memberId, int slot, bool upgradeMaterialAcquired, int specType)
    {
        await _hubContext.Clients.All.SendAsync("UpgradeMaterialUpdated", new
        {
            memberId = memberId.ToString(),
            slot,
            upgradeMaterialAcquired,
            specType
        });
    }

    /// <summary>
    /// Broadcasts that loot has been assigned
    /// </summary>
    public async Task BroadcastLootAssignedAsync(int floorNumber, int? weekNumber)
    {
        await _hubContext.Clients.All.SendAsync("LootAssigned", new
        {
            floorNumber,
            weekNumber
        });
    }

    /// <summary>
    /// Broadcasts that a loot assignment has been undone
    /// </summary>
    public async Task BroadcastLootUndoneAsync(int floorNumber, int? weekNumber)
    {
        await _hubContext.Clients.All.SendAsync("LootUndone", new
        {
            floorNumber,
            weekNumber
        });
    }
}
