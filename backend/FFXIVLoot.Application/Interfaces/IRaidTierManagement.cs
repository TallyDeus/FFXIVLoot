using FFXIVLoot.Application.DTOs;

namespace FFXIVLoot.Application.Interfaces;

/// <summary>
/// Raid tier index, migration, and tier folder lifecycle (create/delete/switch current).
/// </summary>
public interface IRaidTierManagement
{
    /// <summary>Absolute path to the data root directory (contains raid-tiers/, images/, …).</summary>
    string DataRoot { get; }

    Task EnsureInitializedAsync(CancellationToken cancellationToken = default);

    Task<Guid> GetCurrentTierIdAsync(CancellationToken cancellationToken = default);

    /// <summary>True if the tier id exists in the raid tier index.</summary>
    Task<bool> TierExistsAsync(Guid tierId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<RaidTierSummaryDto>> ListTiersAsync(CancellationToken cancellationToken = default);

    /// <summary>All tiers with file-based stats for overview (does not change current tier).</summary>
    Task<IReadOnlyList<RaidTierOverviewDto>> ListTiersWithOverviewAsync(CancellationToken cancellationToken = default);

    Task<RaidTierSummaryDto?> GetCurrentTierAsync(CancellationToken cancellationToken = default);

    Task SetCurrentTierAsync(Guid tierId, CancellationToken cancellationToken = default);

    Task<RaidTierSummaryDto> CreateTierAsync(string name, CancellationToken cancellationToken = default);

    Task DeleteTierAsync(Guid tierId, CancellationToken cancellationToken = default);

    /// <summary>Updates display name of a tier.</summary>
    Task<RaidTierSummaryDto> RenameTierAsync(Guid tierId, string newName, CancellationToken cancellationToken = default);

    /// <summary>True if members.json / weeks.json / loot-assignments.json exist at data root.</summary>
    Task<LegacyRootDataStatusDto> GetLegacyRootDataStatusAsync(CancellationToken cancellationToken = default);

    /// <summary>Moves root-level JSON files into a new tier folder and sets it current.</summary>
    Task<RaidTierSummaryDto> ImportRootJsonFilesAsNewTierAsync(string name, CancellationToken cancellationToken = default);
}
