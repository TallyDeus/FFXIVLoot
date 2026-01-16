using FFXIVLoot.Application.DTOs;
using FFXIVLoot.Application.Helpers;
using FFXIVLoot.Application.Interfaces;
using FFXIVLoot.API.Helpers;
using Microsoft.AspNetCore.Mvc;

namespace FFXIVLoot.API.Controllers;

/// <summary>
/// Controller for managing raid weeks
/// </summary>
[ApiController]
[Route("api/weeks")]
public class WeekController : ControllerBase
{
    private readonly IWeekService _weekService;
    private readonly IWeekDeletionService _weekDeletionService;
    private readonly IAuthenticationService _authService;
    private readonly ILogger<WeekController> _logger;

    /// <summary>
    /// Initializes a new instance of WeekController
    /// </summary>
    public WeekController(IWeekService weekService, IWeekDeletionService weekDeletionService, IAuthenticationService authService, ILogger<WeekController> logger)
    {
        _weekService = weekService ?? throw new ArgumentNullException(nameof(weekService));
        _weekDeletionService = weekDeletionService ?? throw new ArgumentNullException(nameof(weekDeletionService));
        _authService = authService ?? throw new ArgumentNullException(nameof(authService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Gets the current active week
    /// </summary>
    [HttpGet("current")]
    public async Task<ActionResult<WeekDto>> GetCurrentWeek()
    {
        try
        {
            var week = await _weekService.GetCurrentWeekAsync();
            if (week == null)
            {
                return NotFound(new ProblemDetails
                {
                    Title = "Not Found",
                    Detail = "No current week set"
                });
            }
            return Ok(week);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting current week");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "An error occurred while retrieving current week"
            });
        }
    }

    /// <summary>
    /// Gets all weeks
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<WeekDto>>> GetAllWeeks()
    {
        try
        {
            var weeks = await _weekService.GetAllWeeksAsync();
            return Ok(weeks);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all weeks");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "An error occurred while retrieving weeks"
            });
        }
    }

    /// <summary>
    /// Starts a new week
    /// </summary>
    [HttpPost("new")]
    public async Task<ActionResult<WeekDto>> StartNewWeek()
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

            if (!PermissionHelper.CanCreateWeek(currentUser))
            {
                return StatusCode(403, new ProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You do not have permission to create weeks. Only Managers and Administrators can create weeks."
                });
            }

            var week = await _weekService.StartNewWeekAsync();
            return Ok(week);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting new week");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "An error occurred while starting new week"
            });
        }
    }

    /// <summary>
    /// Sets a specific week as the current week
    /// </summary>
    [HttpPost("{weekNumber}/set-current")]
    public async Task<IActionResult> SetCurrentWeek(int weekNumber)
    {
        try
        {
            await _weekService.SetCurrentWeekAsync(weekNumber);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting current week to {WeekNumber}", weekNumber);
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "An error occurred while setting current week"
            });
        }
    }

    /// <summary>
    /// Creates a week with a specific week number
    /// </summary>
    [HttpPost("create/{weekNumber}")]
    public async Task<ActionResult<WeekDto>> CreateWeekWithNumber(int weekNumber)
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

            if (!PermissionHelper.CanCreateWeek(currentUser))
            {
                return StatusCode(403, new ProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You do not have permission to create weeks. Only Managers and Administrators can create weeks."
                });
            }

            var week = await _weekService.CreateWeekWithNumberAsync(weekNumber);
            return Ok(week);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Cannot create week {WeekNumber}: {Error}", weekNumber, ex.Message);
            return BadRequest(new ProblemDetails
            {
                Title = "Bad Request",
                Detail = ex.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating week with number {WeekNumber}", weekNumber);
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "An error occurred while creating the week"
            });
        }
    }

    /// <summary>
    /// Deletes a week and reverts all BiS tracker changes from that week
    /// </summary>
    [HttpDelete("{weekNumber}")]
    public async Task<IActionResult> DeleteWeek(int weekNumber)
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

            if (!PermissionHelper.CanDeleteWeek(currentUser))
            {
                return StatusCode(403, new ProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You do not have permission to delete weeks. Only Administrators can delete weeks."
                });
            }

            await _weekDeletionService.DeleteWeekAndRevertBiSAsync(weekNumber);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Error deleting week: {Error}", ex.Message);
            return BadRequest(new ProblemDetails
            {
                Title = "Bad Request",
                Detail = ex.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting week {WeekNumber}", weekNumber);
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "An error occurred while deleting the week"
            });
        }
    }
}

