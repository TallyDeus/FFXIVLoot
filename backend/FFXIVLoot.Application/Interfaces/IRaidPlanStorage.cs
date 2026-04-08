using FFXIVLoot.Application.DTOs;

namespace FFXIVLoot.Application.Interfaces;

/// <summary>Persists raid strategy links and cached slide data per raid tier: data/raid-tiers/{tierId}/raid-plans.json.</summary>
public interface IRaidPlanStorage
{
    Task<RaidPlanLayoutDto> GetLayoutAsync(Guid raidTierId, CancellationToken cancellationToken = default);

    Task<RaidPlanCategoryDto> CreateCategoryAsync(Guid raidTierId, RaidPlanCategoryCreateDto dto, CancellationToken cancellationToken = default);

    Task<RaidPlanCategoryDto?> UpdateCategoryAsync(Guid raidTierId, Guid id, RaidPlanCategoryUpdateDto dto, CancellationToken cancellationToken = default);

    Task<bool> DeleteCategoryAsync(Guid raidTierId, Guid id, CancellationToken cancellationToken = default);

    Task<RaidPlanDto> CreateAsync(Guid raidTierId, RaidPlanCreateDto dto, CancellationToken cancellationToken = default);

    Task<RaidPlanDto?> UpdateAsync(Guid raidTierId, Guid id, RaidPlanUpdateDto dto, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid raidTierId, Guid id, CancellationToken cancellationToken = default);

    Task<RaidPlanDto?> RefreshAsync(Guid raidTierId, Guid id, CancellationToken cancellationToken = default);

    Task ApplyReorderAsync(Guid raidTierId, RaidPlanReorderDto dto, CancellationToken cancellationToken = default);
}
