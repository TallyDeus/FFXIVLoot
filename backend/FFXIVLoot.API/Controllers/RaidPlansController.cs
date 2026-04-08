using FFXIVLoot.Application.DTOs;
using FFXIVLoot.Application.Interfaces;
using FFXIVLoot.API.Helpers;
using Microsoft.AspNetCore.Mvc;

namespace FFXIVLoot.API.Controllers;

[ApiController]
[Route("api/raid-tiers/{raidTierId:guid}/raid-plans")]
public class RaidPlansController : ControllerBase
{
    private readonly IRaidPlanStorage _raidPlanStorage;
    private readonly IRaidPlanExtractor _extractor;
    private readonly IRaidTierManagement _raidTierManagement;
    private readonly IAuthenticationService _authService;
    private readonly IUpdatesBroadcaster _updatesBroadcaster;
    private readonly ILogger<RaidPlansController> _logger;

    public RaidPlansController(
        IRaidPlanStorage raidPlanStorage,
        IRaidPlanExtractor extractor,
        IRaidTierManagement raidTierManagement,
        IAuthenticationService authService,
        IUpdatesBroadcaster updatesBroadcaster,
        ILogger<RaidPlansController> logger)
    {
        _raidPlanStorage = raidPlanStorage;
        _extractor = extractor;
        _raidTierManagement = raidTierManagement;
        _authService = authService;
        _updatesBroadcaster = updatesBroadcaster;
        _logger = logger;
    }

    private async Task BroadcastRaidPlansChangedAsync(Guid raidTierId)
    {
        try
        {
            await _updatesBroadcaster.BroadcastRaidPlansLayoutChangedAsync(raidTierId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SignalR raid plans broadcast failed for tier {TierId}", raidTierId);
        }
    }

    private async Task<ActionResult?> RequireAuthenticatedUserAndTierAsync(Guid raidTierId, CancellationToken cancellationToken)
    {
        var user = await this.GetCurrentUserAsync(_authService);
        if (user == null)
            return Unauthorized();
        if (!await _raidTierManagement.TierExistsAsync(raidTierId, cancellationToken))
            return NotFound(new ProblemDetails { Title = "Not found", Detail = "Raid tier not found." });
        return null;
    }

    [HttpGet("layout")]
    public async Task<ActionResult<RaidPlanLayoutDto>> Layout(Guid raidTierId, CancellationToken cancellationToken)
    {
        var gate = await RequireAuthenticatedUserAndTierAsync(raidTierId, cancellationToken);
        if (gate != null)
            return gate;

        try
        {
            return Ok(await _raidPlanStorage.GetLayoutAsync(raidTierId, cancellationToken));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading raid plans layout for tier {TierId}", raidTierId);
            return StatusCode(500, new ProblemDetails { Title = "Error", Detail = "Could not load raid plans." });
        }
    }

    /// <summary>Preview extraction without saving (same parser as create).</summary>
    [HttpGet("extract")]
    public async Task<ActionResult<RaidPlanExtractedDto>> Extract(Guid raidTierId, [FromQuery] string url, CancellationToken cancellationToken)
    {
        var gate = await RequireAuthenticatedUserAndTierAsync(raidTierId, cancellationToken);
        if (gate != null)
            return gate;
        if (string.IsNullOrWhiteSpace(url))
            return BadRequest(new ProblemDetails { Title = "Missing url", Detail = "Pass ?url=https://raidplan.io/plan/..." });

        try
        {
            var result = await _extractor.ExtractAsync(url, cancellationToken);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ProblemDetails { Title = "Invalid URL", Detail = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ProblemDetails { Title = "Extract failed", Detail = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Raid plan extract failed");
            return StatusCode(500, new ProblemDetails { Title = "Error", Detail = "Could not fetch or parse the RaidPlan page." });
        }
    }

    [HttpPost("categories")]
    public async Task<ActionResult<RaidPlanCategoryDto>> CreateCategory(Guid raidTierId, [FromBody] RaidPlanCategoryCreateDto dto, CancellationToken cancellationToken)
    {
        var gate = await RequireAuthenticatedUserAndTierAsync(raidTierId, cancellationToken);
        if (gate != null)
            return gate;

        try
        {
            var created = await _raidPlanStorage.CreateCategoryAsync(raidTierId, dto, cancellationToken);
            await BroadcastRaidPlansChangedAsync(raidTierId);
            return Ok(created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ProblemDetails { Title = "Invalid input", Detail = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating category");
            return StatusCode(500, new ProblemDetails { Title = "Error", Detail = "Could not create category." });
        }
    }

    [HttpPut("categories/{id:guid}")]
    public async Task<ActionResult<RaidPlanCategoryDto>> UpdateCategory(Guid raidTierId, Guid id, [FromBody] RaidPlanCategoryUpdateDto dto, CancellationToken cancellationToken)
    {
        var gate = await RequireAuthenticatedUserAndTierAsync(raidTierId, cancellationToken);
        if (gate != null)
            return gate;

        try
        {
            var updated = await _raidPlanStorage.UpdateCategoryAsync(raidTierId, id, dto, cancellationToken);
            if (updated == null)
                return NotFound();
            await BroadcastRaidPlansChangedAsync(raidTierId);
            return Ok(updated);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ProblemDetails { Title = "Invalid input", Detail = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating category {Id}", id);
            return StatusCode(500, new ProblemDetails { Title = "Error", Detail = "Could not update category." });
        }
    }

    [HttpDelete("categories/{id:guid}")]
    public async Task<IActionResult> DeleteCategory(Guid raidTierId, Guid id, CancellationToken cancellationToken)
    {
        var gate = await RequireAuthenticatedUserAndTierAsync(raidTierId, cancellationToken);
        if (gate != null)
            return gate;

        try
        {
            var ok = await _raidPlanStorage.DeleteCategoryAsync(raidTierId, id, cancellationToken);
            if (!ok)
                return NotFound();
            await BroadcastRaidPlansChangedAsync(raidTierId);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ProblemDetails { Title = "Cannot delete", Detail = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting category {Id}", id);
            return StatusCode(500, new ProblemDetails { Title = "Error", Detail = "Could not delete category." });
        }
    }

    [HttpPost]
    public async Task<ActionResult<RaidPlanDto>> Create(Guid raidTierId, [FromBody] RaidPlanCreateDto dto, CancellationToken cancellationToken)
    {
        var gate = await RequireAuthenticatedUserAndTierAsync(raidTierId, cancellationToken);
        if (gate != null)
            return gate;

        try
        {
            var created = await _raidPlanStorage.CreateAsync(raidTierId, dto, cancellationToken);
            await BroadcastRaidPlansChangedAsync(raidTierId);
            return Ok(created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ProblemDetails { Title = "Invalid input", Detail = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ProblemDetails { Title = "Cannot create", Detail = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating raid plan");
            return StatusCode(500, new ProblemDetails { Title = "Error", Detail = "Could not save raid plan." });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<RaidPlanDto>> Update(Guid raidTierId, Guid id, [FromBody] RaidPlanUpdateDto dto, CancellationToken cancellationToken)
    {
        var gate = await RequireAuthenticatedUserAndTierAsync(raidTierId, cancellationToken);
        if (gate != null)
            return gate;

        try
        {
            var updated = await _raidPlanStorage.UpdateAsync(raidTierId, id, dto, cancellationToken);
            if (updated == null)
                return NotFound();
            await BroadcastRaidPlansChangedAsync(raidTierId);
            return Ok(updated);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ProblemDetails { Title = "Invalid input", Detail = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating raid plan {Id}", id);
            return StatusCode(500, new ProblemDetails { Title = "Error", Detail = "Could not update raid plan." });
        }
    }

    [HttpPost("{id:guid}/refresh")]
    public async Task<ActionResult<RaidPlanDto>> Refresh(Guid raidTierId, Guid id, CancellationToken cancellationToken)
    {
        var gate = await RequireAuthenticatedUserAndTierAsync(raidTierId, cancellationToken);
        if (gate != null)
            return gate;

        try
        {
            var updated = await _raidPlanStorage.RefreshAsync(raidTierId, id, cancellationToken);
            if (updated == null)
                return NotFound();
            await BroadcastRaidPlansChangedAsync(raidTierId);
            return Ok(updated);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing raid plan {Id}", id);
            return StatusCode(500, new ProblemDetails { Title = "Error", Detail = "Could not refresh raid plan." });
        }
    }

    [HttpPut("reorder")]
    public async Task<IActionResult> Reorder(Guid raidTierId, [FromBody] RaidPlanReorderDto dto, CancellationToken cancellationToken)
    {
        var gate = await RequireAuthenticatedUserAndTierAsync(raidTierId, cancellationToken);
        if (gate != null)
            return gate;

        try
        {
            await _raidPlanStorage.ApplyReorderAsync(raidTierId, dto, cancellationToken);
            await BroadcastRaidPlansChangedAsync(raidTierId);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reordering raid plans");
            return StatusCode(500, new ProblemDetails { Title = "Error", Detail = "Could not save order." });
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid raidTierId, Guid id, CancellationToken cancellationToken)
    {
        var gate = await RequireAuthenticatedUserAndTierAsync(raidTierId, cancellationToken);
        if (gate != null)
            return gate;

        try
        {
            var ok = await _raidPlanStorage.DeleteAsync(raidTierId, id, cancellationToken);
            if (!ok)
                return NotFound();
            await BroadcastRaidPlansChangedAsync(raidTierId);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting raid plan {Id}", id);
            return StatusCode(500, new ProblemDetails { Title = "Error", Detail = "Could not delete raid plan." });
        }
    }
}
