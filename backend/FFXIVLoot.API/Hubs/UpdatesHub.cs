using Microsoft.AspNetCore.SignalR;

namespace FFXIVLoot.API.Hubs;

/// <summary>
/// SignalR hub for broadcasting real-time updates to clients
/// </summary>
public class UpdatesHub : Hub
{
    /// <summary>
    /// Called when a client connects
    /// </summary>
    public override Task OnConnectedAsync()
    {
        return base.OnConnectedAsync();
    }

    /// <summary>
    /// Called when a client disconnects
    /// </summary>
    public override Task OnDisconnectedAsync(Exception? exception)
    {
        return base.OnDisconnectedAsync(exception);
    }
}
