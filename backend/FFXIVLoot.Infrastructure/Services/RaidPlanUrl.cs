namespace FFXIVLoot.Infrastructure.Services;

/// <summary>Shared validation for RaidPlan.io HTTPS URLs (storage + HTTP fetch).</summary>
public static class RaidPlanUrl
{
    public static string NormalizeAndValidate(string raw)
    {
        var trimmed = raw.Trim();
        if (string.IsNullOrEmpty(trimmed))
            throw new ArgumentException("RaidPlan URL is required.");

        if (!Uri.TryCreate(trimmed, UriKind.Absolute, out var uri) ||
            uri.Scheme != Uri.UriSchemeHttps)
            throw new ArgumentException("URL must be a valid https link.");

        if (string.IsNullOrEmpty(uri.Host) || !IsRaidplanHost(uri.Host))
            throw new ArgumentException("Only https://raidplan.io/... links are allowed.");

        // Fragment (#2, #3 slide navigation on RaidPlan.io) is not sent with HTTP requests; store canonical URL without it.
        return uri.GetLeftPart(UriPartial.Path) + uri.Query;
    }

    private static bool IsRaidplanHost(string host) =>
        host.Equals("raidplan.io", StringComparison.OrdinalIgnoreCase) ||
        host.Equals("www.raidplan.io", StringComparison.OrdinalIgnoreCase);
}
