using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using FFXIVLoot.Application.Helpers;
using FFXIVLoot.Domain.Enums;
using FFXIVLoot.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace FFXIVLoot.Infrastructure.GamerEscape;

/// <summary>
/// Looks up a weapon on ffxiv.gamerescape.com and parses the infobox "Requires" row for job codes.
/// </summary>
public sealed class GamerEscapeWikiJobResolver : IWikiWeaponJobResolver
{
    private static readonly Regex RequiresCellRegex = new(
        @"Requires\s*</td>\s*<td[^>]*>(?<cell>[\s\S]*?)</td>",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex StripTagsRegex = new(@"<[^>]+>", RegexOptions.Compiled);

    private readonly HttpClient _http;
    private readonly ILogger<GamerEscapeWikiJobResolver> _logger;

    public GamerEscapeWikiJobResolver(HttpClient http, ILogger<GamerEscapeWikiJobResolver> logger)
    {
        _http = http;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<(bool success, string abbrev, BisJobCategory category)> TryResolveJobAsync(
        string weaponItemName,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(weaponItemName) || weaponItemName.Trim().Length < 2)
            return (false, string.Empty, BisJobCategory.Unknown);

        var title = EncodeWikiTitle(weaponItemName.Trim());
        try
        {
            using var response = await _http.GetAsync($"wiki/{title}", cancellationToken);
            if (response.StatusCode == HttpStatusCode.NotFound)
                return (false, string.Empty, BisJobCategory.Unknown);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogDebug("Gamer Escape HTTP {Code} for weapon {Weapon}", response.StatusCode, weaponItemName);
                return (false, string.Empty, BisJobCategory.Unknown);
            }

            var html = await response.Content.ReadAsStringAsync(cancellationToken);
            var match = RequiresCellRegex.Match(html);
            if (!match.Success)
            {
                _logger.LogDebug("No Requires cell found on wiki for {Weapon}", weaponItemName);
                return (false, string.Empty, BisJobCategory.Unknown);
            }

            var cellHtml = match.Groups["cell"].Value;
            var plain = WebUtility.HtmlDecode(StripTagsRegex.Replace(cellHtml, " "));
            if (BisJobSlugHelper.TryNormalizeFromRequiresPlainText(plain, out var abbrev, out var category))
                return (true, abbrev, category);

            _logger.LogDebug("Requires text did not match known jobs for {Weapon}: {Plain}", weaponItemName, plain);
            return (false, string.Empty, BisJobCategory.Unknown);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Wiki job lookup failed for {Weapon}", weaponItemName);
            return (false, string.Empty, BisJobCategory.Unknown);
        }
    }

    /// <summary>
    /// MediaWiki title: spaces → underscores, apostrophe → %27, other non-ASCII/special via escape.
    /// </summary>
    internal static string EncodeWikiTitle(string itemName)
    {
        var sb = new StringBuilder(itemName.Length + 8);
        foreach (var c in itemName)
        {
            switch (c)
            {
                case ' ':
                    sb.Append('_');
                    break;
                case '\'':
                    sb.Append("%27");
                    break;
                default:
                    if (c < 128 && (char.IsLetterOrDigit(c) || c is '-' or '.' or '(' or ')' or ',' or ':' or '!' or '?'))
                        sb.Append(c);
                    else
                        sb.Append(Uri.EscapeDataString(c.ToString()));
                    break;
            }
        }

        return sb.ToString();
    }
}
