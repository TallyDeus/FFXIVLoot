using FFXIVLoot.Application.DTOs;

namespace FFXIVLoot.Application.Interfaces;

/// <summary>Fetches a RaidPlan.io page and parses embedded plan JSON (slides, images, text overlays).</summary>
public interface IRaidPlanExtractor
{
    /// <exception cref="InvalidOperationException">When the page cannot be fetched or parsed.</exception>
    Task<RaidPlanExtractedDto> ExtractAsync(string raidplanHttpsUrl, CancellationToken cancellationToken = default);
}
