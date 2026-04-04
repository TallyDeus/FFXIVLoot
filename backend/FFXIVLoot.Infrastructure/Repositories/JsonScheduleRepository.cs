using FFXIVLoot.Application.DTOs;
using FFXIVLoot.Application.Interfaces;
using FFXIVLoot.Infrastructure.Storage;

namespace FFXIVLoot.Infrastructure.Repositories;

/// <summary>schedule.json in the current raid tier directory.</summary>
public sealed class JsonScheduleRepository : IScheduleRepository
{
    private readonly IRaidTierManagement _raidTierManagement;

    public JsonScheduleRepository(IRaidTierManagement raidTierManagement)
    {
        _raidTierManagement = raidTierManagement ?? throw new ArgumentNullException(nameof(raidTierManagement));
    }

    private async Task<JsonFileStorage> StorageAsync()
    {
        var tierId = await _raidTierManagement.GetCurrentTierIdAsync();
        var path = Path.Combine(_raidTierManagement.DataRoot, "raid-tiers", tierId.ToString(), "schedule.json");
        return new JsonFileStorage(path);
    }

    public async Task<ScheduleFileData?> LoadAsync(CancellationToken cancellationToken = default)
    {
        var storage = await StorageAsync();
        var data = await storage.ReadAsync<ScheduleFileData>();
        return data;
    }

    public async Task SaveAsync(ScheduleFileData data, CancellationToken cancellationToken = default)
    {
        var storage = await StorageAsync();
        await storage.WriteAsync(data);
    }
}
