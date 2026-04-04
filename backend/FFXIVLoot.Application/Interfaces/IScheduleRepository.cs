using FFXIVLoot.Application.DTOs;

namespace FFXIVLoot.Application.Interfaces;

/// <summary>Reads/writes schedule.json for the current raid tier.</summary>
public interface IScheduleRepository
{
    Task<ScheduleFileData?> LoadAsync(CancellationToken cancellationToken = default);

    Task SaveAsync(ScheduleFileData data, CancellationToken cancellationToken = default);
}
