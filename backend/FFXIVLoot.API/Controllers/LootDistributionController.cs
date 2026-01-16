using FFXIVLoot.Application.DTOs;
using FFXIVLoot.Application.Helpers;
using FFXIVLoot.Application.Interfaces;
using FFXIVLoot.API.Helpers;
using FFXIVLoot.Domain.Enums;
using Microsoft.AspNetCore.Mvc;

namespace FFXIVLoot.API.Controllers;

/// <summary>
/// Controller for managing loot distribution
/// </summary>
[ApiController]
[Route("api/loot")]
public class LootDistributionController : ControllerBase
{
    private readonly ILootDistributionService _lootDistributionService;
    private readonly IAuthenticationService _authService;
    private readonly ILogger<LootDistributionController> _logger;

    /// <summary>
    /// Initializes a new instance of LootDistributionController
    /// </summary>
    public LootDistributionController(ILootDistributionService lootDistributionService, IAuthenticationService authService, ILogger<LootDistributionController> logger)
    {
        _lootDistributionService = lootDistributionService ?? throw new ArgumentNullException(nameof(lootDistributionService));
        _authService = authService ?? throw new ArgumentNullException(nameof(authService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Gets available loot for a specific floor and members who need each piece
    /// </summary>
    [HttpGet("floors/{floorNumber}/available")]
    public async Task<ActionResult<List<AvailableLootDto>>> GetAvailableLoot(int floorNumber, [FromQuery] int? weekNumber = null)
    {
        try
        {
            if (!Enum.IsDefined(typeof(FloorNumber), floorNumber))
            {
                return BadRequest(new ProblemDetails
                {
                    Title = "Bad Request",
                    Detail = $"Invalid floor number: {floorNumber}. Must be between 1 and 4."
                });
            }

            var floor = (FloorNumber)floorNumber;
            var availableLoot = await _lootDistributionService.GetAvailableLootAndEligibleMembersAsync(floor, weekNumber);
            return Ok(availableLoot);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting available loot for floor {FloorNumber}, weekNumber: {WeekNumber}. Exception: {ExceptionMessage}", 
                floorNumber, weekNumber, ex.Message);
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = $"An error occurred while retrieving available loot: {ex.Message}"
            });
        }
    }

    /// <summary>
    /// Assigns loot to a member
    /// </summary>
    [HttpPost("assign")]
    public async Task<ActionResult<Guid>> AssignLoot([FromBody] LootAssignmentRequestDto request)
    {
        try
        {
            var authHeader = Request.Headers["Authorization"].FirstOrDefault();
            var tokenPreview = authHeader != null && authHeader.Length > 7 
                ? authHeader.Substring(7, Math.Min(10, authHeader.Length - 7)) + "..." 
                : "none";
            _logger.LogInformation("AssignLoot - Authorization header: {HasHeader}, Token preview: {TokenPreview}", 
                !string.IsNullOrEmpty(authHeader), tokenPreview);
            
            var currentUser = await this.GetCurrentUserAsync(_authService);
            if (currentUser == null)
            {
                _logger.LogWarning("AssignLoot - Unauthorized: currentUser is null. Auth header was: {HasHeader}", 
                    !string.IsNullOrEmpty(authHeader));
                return Unauthorized(new ProblemDetails
                {
                    Title = "Unauthorized",
                    Detail = "Authentication required. Please log in again. (Session may have expired or backend was restarted)"
                });
            }
            
            _logger.LogInformation("AssignLoot - Authenticated as: {MemberName} (ID: {MemberId})", 
                currentUser.Name, currentUser.Id);

            if (!PermissionHelper.CanAssignLoot(currentUser))
            {
                return Forbid();
            }

            if (!Enum.IsDefined(typeof(FloorNumber), request.FloorNumber))
            {
                return BadRequest(new ProblemDetails
                {
                    Title = "Bad Request",
                    Detail = $"Invalid floor number: {request.FloorNumber}. Must be between 1 and 4."
                });
            }

            var floor = (FloorNumber)request.FloorNumber;
            var specType = (SpecType)request.SpecType;
            var assignmentId = await _lootDistributionService.AssignLootToMemberAsync(
                request.MemberId, 
                request.Slot, 
                floor,
                specType);
            return Ok(new { AssignmentId = assignmentId });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Error assigning loot: {Error}", ex.Message);
            return BadRequest(new ProblemDetails
            {
                Title = "Bad Request",
                Detail = ex.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error assigning loot to member {MemberId}, slot {Slot}", request.MemberId, request.Slot);
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "An error occurred while assigning loot"
            });
        }
    }

    /// <summary>
    /// Assigns an upgrade material to a member
    /// </summary>
    [HttpPost("assign-upgrade")]
    public async Task<ActionResult<Guid>> AssignUpgradeMaterial([FromBody] UpgradeMaterialAssignmentRequestDto request)
    {
        try
        {
            var currentUser = await this.GetCurrentUserAsync(_authService);
            if (currentUser == null)
            {
                return Unauthorized(new ProblemDetails
                {
                    Title = "Unauthorized",
                    Detail = "Authentication required"
                });
            }

            if (!PermissionHelper.CanAssignLoot(currentUser))
            {
                return Forbid();
            }

            if (!Enum.IsDefined(typeof(FloorNumber), request.FloorNumber))
            {
                return BadRequest(new ProblemDetails
                {
                    Title = "Bad Request",
                    Detail = $"Invalid floor number: {request.FloorNumber}. Must be between 1 and 4."
                });
            }

            var floor = (FloorNumber)request.FloorNumber;
            var specType = (SpecType)request.SpecType;
            var assignmentId = await _lootDistributionService.AssignUpgradeMaterialAsync(
                request.MemberId, 
                request.IsArmorMaterial,
                floor,
                specType);
            return Ok(new { AssignmentId = assignmentId });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Error assigning upgrade material: {Error}", ex.Message);
            return BadRequest(new ProblemDetails
            {
                Title = "Bad Request",
                Detail = ex.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error assigning upgrade material to member {MemberId}", request.MemberId);
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "An error occurred while assigning upgrade material"
            });
        }
    }

    /// <summary>
    /// Gets acquisition counts for Extra loot (how many times each member has received this item as Extra)
    /// </summary>
    [HttpGet("extra/counts")]
    public async Task<ActionResult<Dictionary<Guid, int>>> GetExtraLootAcquisitionCounts(
        [FromQuery] int? slot = null,
        [FromQuery] bool isUpgradeMaterial = false,
        [FromQuery] bool? isArmorMaterial = null)
    {
        try
        {
            GearSlot? gearSlot = slot.HasValue && Enum.IsDefined(typeof(GearSlot), slot.Value)
                ? (GearSlot?)slot.Value
                : null;

            var counts = await _lootDistributionService.GetExtraLootAcquisitionCountsAsync(
                gearSlot, 
                isUpgradeMaterial, 
                isArmorMaterial);
            return Ok(counts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting Extra loot acquisition counts");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "An error occurred while retrieving acquisition counts"
            });
        }
    }

    /// <summary>
    /// Undoes a loot assignment
    /// </summary>
    [HttpPost("undo/{assignmentId}")]
    public async Task<IActionResult> UndoAssignment(Guid assignmentId)
    {
        try
        {
            var currentUser = await this.GetCurrentUserAsync(_authService);
            if (currentUser == null)
            {
                return Unauthorized(new ProblemDetails
                {
                    Title = "Unauthorized",
                    Detail = "Authentication required"
                });
            }

            if (!PermissionHelper.CanAssignLoot(currentUser))
            {
                return Forbid();
            }

            await _lootDistributionService.UndoAssignmentAsync(assignmentId);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Error undoing assignment: {Error}", ex.Message);
            return BadRequest(new ProblemDetails
            {
                Title = "Bad Request",
                Detail = ex.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error undoing assignment {AssignmentId}", assignmentId);
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "An error occurred while undoing assignment"
            });
        }
    }
}

