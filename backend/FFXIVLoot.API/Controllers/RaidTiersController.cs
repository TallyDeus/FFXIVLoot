using FFXIVLoot.Application.DTOs;
using FFXIVLoot.Application.Helpers;
using FFXIVLoot.Application.Interfaces;
using FFXIVLoot.API.Helpers;
using FFXIVLoot.Domain.Enums;
using Microsoft.AspNetCore.Mvc;

namespace FFXIVLoot.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RaidTiersController : ControllerBase
{
    private readonly IRaidTierManagement _raidTierManagement;
    private readonly IAuthenticationService _authService;
    private readonly ILogger<RaidTiersController> _logger;

    public RaidTiersController(
        IRaidTierManagement raidTierManagement,
        IAuthenticationService authService,
        ILogger<RaidTiersController> logger)
    {
        _raidTierManagement = raidTierManagement;
        _authService = authService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RaidTierSummaryDto>>> List(CancellationToken cancellationToken)
    {
        try
        {
            var currentUser = await this.GetCurrentUserAsync(_authService);
            if (currentUser == null)
                return Unauthorized();

            if (currentUser.PermissionRole != PermissionRole.Administrator &&
                currentUser.PermissionRole != PermissionRole.Manager)
                return Forbid();

            var tiers = await _raidTierManagement.ListTiersAsync(cancellationToken);
            return Ok(tiers);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing raid tiers");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "Could not load raid tiers."
            });
        }
    }

    [HttpGet("overview")]
    public async Task<ActionResult<IReadOnlyList<RaidTierOverviewDto>>> Overview(CancellationToken cancellationToken)
    {
        try
        {
            var currentUser = await this.GetCurrentUserAsync(_authService);
            if (currentUser == null)
                return Unauthorized();

            var tiers = await _raidTierManagement.ListTiersWithOverviewAsync(cancellationToken);
            return Ok(tiers);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading raid tier overview");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "Could not load raid tier overview."
            });
        }
    }

    [HttpGet("current")]
    public async Task<ActionResult<RaidTierSummaryDto>> GetCurrent(CancellationToken cancellationToken)
    {
        try
        {
            var currentUser = await this.GetCurrentUserAsync(_authService);
            if (currentUser == null)
                return Unauthorized();

            var tier = await _raidTierManagement.GetCurrentTierAsync(cancellationToken);
            if (tier == null)
                return NotFound();
            return Ok(tier);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reading current raid tier");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "Could not load the current raid tier."
            });
        }
    }

    [HttpPut("current/{tierId:guid}")]
    public async Task<IActionResult> SetCurrent(Guid tierId, CancellationToken cancellationToken)
    {
        try
        {
            var currentUser = await this.GetCurrentUserAsync(_authService);
            if (currentUser == null)
                return Unauthorized();

            if (currentUser.PermissionRole != PermissionRole.Administrator &&
                currentUser.PermissionRole != PermissionRole.Manager)
                return Forbid();

            await _raidTierManagement.SetCurrentTierAsync(tierId, cancellationToken);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new ProblemDetails { Title = "Not Found", Detail = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error switching raid tier");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "Could not switch raid tier."
            });
        }
    }

    [HttpGet("legacy-root-status")]
    public async Task<ActionResult<LegacyRootDataStatusDto>> LegacyRootStatus(CancellationToken cancellationToken)
    {
        try
        {
            var currentUser = await this.GetCurrentUserAsync(_authService);
            if (currentUser == null)
                return Unauthorized();

            if (currentUser.PermissionRole != PermissionRole.Administrator &&
                currentUser.PermissionRole != PermissionRole.Manager)
                return Forbid();

            var status = await _raidTierManagement.GetLegacyRootDataStatusAsync(cancellationToken);
            return Ok(status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking legacy root data");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "Could not check legacy data files."
            });
        }
    }

    [HttpPost("import-from-root")]
    public async Task<ActionResult<RaidTierSummaryDto>> ImportFromRoot([FromBody] CreateRaidTierRequestDto body, CancellationToken cancellationToken)
    {
        try
        {
            var currentUser = await this.GetCurrentUserAsync(_authService);
            if (currentUser == null)
                return Unauthorized();

            if (currentUser.PermissionRole != PermissionRole.Administrator &&
                currentUser.PermissionRole != PermissionRole.Manager)
                return Forbid();

            var tier = await _raidTierManagement.ImportRootJsonFilesAsNewTierAsync(body.Name, cancellationToken);
            return StatusCode(StatusCodes.Status201Created, tier);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ProblemDetails { Title = "Bad Request", Detail = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ProblemDetails { Title = "Bad Request", Detail = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing root JSON into a raid tier");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "Could not import legacy data."
            });
        }
    }

    [HttpPatch("{tierId:guid}")]
    public async Task<ActionResult<RaidTierSummaryDto>> Rename(Guid tierId, [FromBody] RenameRaidTierRequestDto body, CancellationToken cancellationToken)
    {
        try
        {
            var currentUser = await this.GetCurrentUserAsync(_authService);
            if (currentUser == null)
                return Unauthorized();

            if (currentUser.PermissionRole != PermissionRole.Administrator &&
                currentUser.PermissionRole != PermissionRole.Manager)
                return Forbid();

            var tier = await _raidTierManagement.RenameTierAsync(tierId, body.Name, cancellationToken);
            return Ok(tier);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ProblemDetails { Title = "Bad Request", Detail = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new ProblemDetails { Title = "Not Found", Detail = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error renaming raid tier");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "Could not rename raid tier."
            });
        }
    }

    [HttpPost]
    public async Task<ActionResult<RaidTierSummaryDto>> Create([FromBody] CreateRaidTierRequestDto body, CancellationToken cancellationToken)
    {
        try
        {
            var currentUser = await this.GetCurrentUserAsync(_authService);
            if (currentUser == null)
                return Unauthorized();

            if (currentUser.PermissionRole != PermissionRole.Administrator &&
                currentUser.PermissionRole != PermissionRole.Manager)
                return Forbid();

            var tier = await _raidTierManagement.CreateTierAsync(body.Name, cancellationToken);
            return StatusCode(StatusCodes.Status201Created, tier);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ProblemDetails { Title = "Bad Request", Detail = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating raid tier");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "Could not create raid tier."
            });
        }
    }

    [HttpDelete("{tierId:guid}")]
    public async Task<IActionResult> Delete(Guid tierId, CancellationToken cancellationToken)
    {
        try
        {
            var currentUser = await this.GetCurrentUserAsync(_authService);
            if (currentUser == null)
                return Unauthorized();

            if (currentUser.PermissionRole != PermissionRole.Administrator)
                return Forbid();

            await _raidTierManagement.DeleteTierAsync(tierId, cancellationToken);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ProblemDetails { Title = "Bad Request", Detail = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting raid tier");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "Could not delete raid tier."
            });
        }
    }
}
