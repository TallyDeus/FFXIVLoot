using FFXIVLoot.Domain.Enums;

namespace FFXIVLoot.Application.Helpers;

/// <summary>
/// Maps XivGear job slugs (from import / bis| links, typically lowercase 3-letter) to BiS abbrev + category.
/// </summary>
public static class BisJobSlugHelper
{
    private static readonly Dictionary<string, BisJobCategory> AbbrevToCategory =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["DRK"] = BisJobCategory.Tank,
            ["GNB"] = BisJobCategory.Tank,
            ["PLD"] = BisJobCategory.Tank,
            ["WAR"] = BisJobCategory.Tank,
            ["AST"] = BisJobCategory.Healer,
            ["SCH"] = BisJobCategory.Healer,
            ["SGE"] = BisJobCategory.Healer,
            ["WHM"] = BisJobCategory.Healer,
            ["DRG"] = BisJobCategory.DpsMelee,
            ["MNK"] = BisJobCategory.DpsMelee,
            ["NIN"] = BisJobCategory.DpsMelee,
            ["RPR"] = BisJobCategory.DpsMelee,
            ["SAM"] = BisJobCategory.DpsMelee,
            ["VPR"] = BisJobCategory.DpsMelee,
            ["BRD"] = BisJobCategory.DpsPhysRanged,
            ["DNC"] = BisJobCategory.DpsPhysRanged,
            ["MCH"] = BisJobCategory.DpsPhysRanged,
            ["BLM"] = BisJobCategory.DpsCaster,
            ["PCT"] = BisJobCategory.DpsCaster,
            ["RDM"] = BisJobCategory.DpsCaster,
            ["SMN"] = BisJobCategory.DpsCaster,
        };

    /// <summary>
    /// Returns uppercase abbrev and category when <paramref name="slug"/> is a known job code (any casing).
    /// </summary>
    public static bool TryNormalize(string? slug, out string abbrev, out BisJobCategory category)
    {
        abbrev = string.Empty;
        category = BisJobCategory.Unknown;
        if (string.IsNullOrWhiteSpace(slug))
            return false;

        var key = slug.Trim().ToUpperInvariant();
        if (!AbbrevToCategory.TryGetValue(key, out var cat))
            return false;

               abbrev = key;
        category = cat;
        return true;
    }

    /// <summary>
    /// Parses plain text from a wiki "Requires" cell (e.g. "PGL, MNK" with HTML already stripped).
    /// Uses the last token that matches a known job abbrev (class codes like PGL are ignored).
    /// </summary>
    public static bool TryNormalizeFromRequiresPlainText(string? plainText, out string abbrev, out BisJobCategory category)
    {
        abbrev = string.Empty;
        category = BisJobCategory.Unknown;
        if (string.IsNullOrWhiteSpace(plainText))
            return false;

        var parts = plainText.Split(new[] { ',', '，', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        string? lastAbbrev = null;
        BisJobCategory lastCat = BisJobCategory.Unknown;
        foreach (var part in parts)
        {
            var token = part.Trim();
            if (string.IsNullOrEmpty(token))
                continue;
            if (TryNormalize(token, out var ab, out var c))
            {
                lastAbbrev = ab;
                lastCat = c;
            }
        }

        if (lastAbbrev == null)
            return false;
        abbrev = lastAbbrev;
        category = lastCat;
        return true;
    }

    /// <summary>
    /// Raid role grouping: tank/healer → Support, else DPS (matches member form logic).
    /// </summary>
    public static MemberRole MemberRoleFromCategory(BisJobCategory c) =>
        c is BisJobCategory.Tank or BisJobCategory.Healer ? MemberRole.Support : MemberRole.DPS;
}
