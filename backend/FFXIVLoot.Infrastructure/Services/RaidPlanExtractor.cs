using System.Text.Json;
using System.Text.RegularExpressions;
using FFXIVLoot.Application.DTOs;
using FFXIVLoot.Application.Interfaces;

namespace FFXIVLoot.Infrastructure.Services;

/// <summary>
/// Parses Next.js __NEXT_DATA__ from raidplan.io HTML. Slides use meta.step (0-based); arena imageUrl is usually a single
/// shared background; itext nodes become per-slide text. The app viewer uses a cropped iframe to show the plan canvas area.
/// </summary>
public sealed partial class RaidPlanExtractor : IRaidPlanExtractor
{
    private readonly HttpClient _http;

    public RaidPlanExtractor(HttpClient http)
    {
        _http = http;
        _http.DefaultRequestHeaders.UserAgent.ParseAdd(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    }

    public async Task<RaidPlanExtractedDto> ExtractAsync(string raidplanHttpsUrl, CancellationToken cancellationToken = default)
    {
        var normalized = RaidPlanUrl.NormalizeAndValidate(raidplanHttpsUrl);
        using var response = await _http.GetAsync(normalized, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        response.EnsureSuccessStatusCode();
        var html = await response.Content.ReadAsStringAsync(cancellationToken);

        var m = NextDataRegex().Match(html);
        if (!m.Success)
            throw new InvalidOperationException("Could not find plan data on the page (RaidPlan.io layout may have changed).");

        using var doc = JsonDocument.Parse(m.Groups[1].Value);
        if (!doc.RootElement.TryGetProperty("props", out var props) ||
            !props.TryGetProperty("pageProps", out var pageProps) ||
            !pageProps.TryGetProperty("_plan", out var planEl))
            throw new InvalidOperationException("Invalid plan payload.");

        var title = planEl.TryGetProperty("name", out var nameEl) ? nameEl.GetString() ?? "Raid plan" : "Raid plan";
        var notesRaw = planEl.TryGetProperty("notes_raw", out var nr) ? nr.GetString() : null;

        if (!planEl.TryGetProperty("steps", out var stepsEl) || stepsEl.ValueKind != JsonValueKind.Number)
            throw new InvalidOperationException("Plan has no step count.");
        var slideCount = stepsEl.GetInt32();
        if (slideCount < 1)
            throw new InvalidOperationException("Plan has no slides.");

        if (!planEl.TryGetProperty("nodes", out var nodesEl) || nodesEl.ValueKind != JsonValueKind.Array)
            throw new InvalidOperationException("Plan has no nodes.");

        var nodes = nodesEl.EnumerateArray().ToList();

        var slides = BuildSlides(nodes, slideCount);

        return new RaidPlanExtractedDto
        {
            Title = title,
            SourceUrl = normalized,
            GlobalNotesRaw = notesRaw,
            Slides = slides
        };
    }

    private static List<RaidPlanSlideDto> BuildSlides(List<JsonElement> nodes, int slideCount)
    {
        var slides = new List<RaidPlanSlideDto>();
        string? lastBg = null;

        for (var s = 0; s < slideCount; s++)
        {
            foreach (var n in nodes)
            {
                if (!TryGetStep(n, out var step) || step != s)
                    continue;
                if (!TryGetString(n, "type", out var type) || type != "arena")
                    continue;
                if (!TryGetAttr(n, out var attr))
                    continue;
                if (!attr.TryGetProperty("shape", out var sh) || sh.GetString() != "image")
                    continue;
                if (attr.TryGetProperty("imageUrl", out var iu) && iu.ValueKind == JsonValueKind.String)
                {
                    var url = iu.GetString();
                    if (!string.IsNullOrWhiteSpace(url))
                        lastBg = url;
                }
            }

            var textParts = new List<string>();
            foreach (var n in nodes)
            {
                if (!TryGetStep(n, out var step) || step != s)
                    continue;
                if (!TryGetString(n, "type", out var type) || type != "itext")
                    continue;
                if (!TryGetAttr(n, out var attr))
                    continue;
                if (!attr.TryGetProperty("text", out var te) || te.ValueKind != JsonValueKind.String)
                    continue;
                var tx = te.GetString();
                if (!string.IsNullOrWhiteSpace(tx))
                    textParts.Add(tx.Trim());
            }

            slides.Add(new RaidPlanSlideDto
            {
                Index = s,
                BackgroundImageUrl = lastBg,
                OverlayTextNotes = string.Join("\n\n", textParts)
            });
        }

        return slides;
    }

    private static bool TryGetStep(JsonElement n, out int step)
    {
        step = 0;
        if (!n.TryGetProperty("meta", out var meta))
            return false;
        if (!meta.TryGetProperty("step", out var st))
            return false;
        if (st.ValueKind == JsonValueKind.Number)
        {
            step = st.GetInt32();
            return true;
        }
        return false;
    }

    private static bool TryGetAttr(JsonElement n, out JsonElement attr)
    {
        attr = default;
        return n.TryGetProperty("attr", out attr);
    }

    private static bool TryGetString(JsonElement n, string name, out string? value)
    {
        value = null;
        if (!n.TryGetProperty(name, out var el) || el.ValueKind != JsonValueKind.String)
            return false;
        value = el.GetString();
        return true;
    }

    [GeneratedRegex(@"<script id=""__NEXT_DATA__"" type=""application/json"">([^<]+)</script>", RegexOptions.Singleline)]
    private static partial Regex NextDataRegex();
}
