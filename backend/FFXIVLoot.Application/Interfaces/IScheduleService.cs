using FFXIVLoot.Application.DTOs;
using FFXIVLoot.Domain.Entities;
using FFXIVLoot.Domain.Enums;

namespace FFXIVLoot.Application.Interfaces;

public interface IScheduleService
{
    Task<ScheduleViewDto> GetViewAsync(DateOnly viewStartMonday, CancellationToken cancellationToken = default);

    Task<ScheduleViewDto> UpsertResponseAsync(
        Member currentUser,
        DateOnly viewStartMonday,
        ScheduleResponseUpsertDto dto,
        CancellationToken cancellationToken = default);

    Task<ScheduleViewDto> UpsertWeekResponsesBulkAsync(
        Member currentUser,
        DateOnly viewStartMonday,
        ScheduleWeekResponseBulkUpsertDto dto,
        CancellationToken cancellationToken = default);

    Task<ScheduleViewDto> UpdateStandardDaysAsync(
        Member currentUser,
        DateOnly viewStartMonday,
        ScheduleSettingsUpdateDto dto,
        CancellationToken cancellationToken = default);

    Task<ScheduleViewDto> UpsertWeekCommentAsync(
        Member currentUser,
        DateOnly viewStartMonday,
        ScheduleWeekCommentUpsertDto dto,
        CancellationToken cancellationToken = default);
}
