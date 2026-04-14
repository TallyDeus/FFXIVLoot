using FFXIVLoot.Domain.Enums;

namespace FFXIVLoot.Domain.Interfaces;

/// <summary>
/// Resolves combat job (abbrev + category) from an in-game weapon name, e.g. via Gamer Escape wiki.
/// </summary>
public interface IWikiWeaponJobResolver
{
    /// <summary>
    /// Fetches wiki metadata for the weapon and parses a known job abbreviation when possible.
    /// </summary>
    Task<(bool success, string abbrev, BisJobCategory category)> TryResolveJobAsync(
        string weaponItemName,
        CancellationToken cancellationToken = default);
}
