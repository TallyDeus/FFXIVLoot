using FFXIVLoot.Application.DTOs;
using FFXIVLoot.Application.Interfaces;
using FFXIVLoot.Application.Services;
using FFXIVLoot.API.Helpers;
using FFXIVLoot.Domain.Enums;
using Microsoft.AspNetCore.Mvc;

namespace FFXIVLoot.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ScheduleController : ControllerBase
{
    private readonly IScheduleService _scheduleService;
    private readonly IAuthenticationService _authService;
    private readonly IUpdatesBroadcaster _updatesBroadcaster;
    private readonly ILogger<ScheduleController> _logger;

    public ScheduleController(
        IScheduleService scheduleService,
        IAuthenticationService authService,
        IUpdatesBroadcaster updatesBroadcaster,
        ILogger<ScheduleController> logger)
    {
        _scheduleService = scheduleService;
        _authService = authService;
        _updatesBroadcaster = updatesBroadcaster;
        _logger = logger;
    }

    /// <summary>13 weeks of schedule (2 before current week + current + 10 ahead) unless viewStart is set.</summary>
    [HttpGet]
    public async Task<ActionResult<ScheduleViewDto>> Get([FromQuery] string? viewStart, CancellationToken cancellationToken)
    {
        try
        {
            var currentUser = await this.GetCurrentUserAsync(_authService);
            if (currentUser == null)
                return Unauthorized();

            DateOnly anchor;
            if (string.IsNullOrWhiteSpace(viewStart))
            {
                var thisMonday = ScheduleService.GetMondayOfWeek(DateOnly.FromDateTime(DateTime.UtcNow.Date));
                anchor = thisMonday.AddDays(-14);
            }
            else if (!DateOnly.TryParse(viewStart, out anchor))
            {
                return BadRequest(new ProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "viewStart must be a date in yyyy-MM-dd format."
                });
            }
            else
            {
                anchor = ScheduleService.GetMondayOfWeek(anchor);
            }

            var view = await _scheduleService.GetViewAsync(anchor, cancellationToken);
            return Ok(view);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading schedule");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "Could not load schedule."
            });
        }
    }

    [HttpPut("response")]
    public async Task<ActionResult<ScheduleViewDto>> UpsertResponse(
        [FromQuery] string viewStart,
        [FromBody] ScheduleResponseUpsertDto dto,
        CancellationToken cancellationToken)
    {
        try
        {
            var currentUser = await this.GetCurrentUserAsync(_authService);
            if (currentUser == null)
                return Unauthorized();

            if (string.IsNullOrWhiteSpace(viewStart) || !DateOnly.TryParse(viewStart, out var anchor))
            {
                return BadRequest(new ProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "viewStart query (yyyy-MM-dd) is required."
                });
            }

            anchor = ScheduleService.GetMondayOfWeek(anchor);
            var view = await _scheduleService.UpsertResponseAsync(currentUser, anchor, dto, cancellationToken);
            try
            {
                await _updatesBroadcaster.BroadcastScheduleUpdatedAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "SignalR schedule broadcast failed after response upsert");
            }

            return Ok(view);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
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
            _logger.LogError(ex, "Error updating schedule response");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "Could not save availability."
            });
        }
    }

    [HttpPut("settings")]
    public async Task<ActionResult<ScheduleViewDto>> UpdateSettings(
        [FromQuery] string viewStart,
        [FromBody] ScheduleSettingsUpdateDto dto,
        CancellationToken cancellationToken)
    {
        try
        {
            var currentUser = await this.GetCurrentUserAsync(_authService);
            if (currentUser == null)
                return Unauthorized();

            if (currentUser.PermissionRole != PermissionRole.Manager &&
                currentUser.PermissionRole != PermissionRole.Administrator)
            {
                return Forbid();
            }

            if (string.IsNullOrWhiteSpace(viewStart) || !DateOnly.TryParse(viewStart, out var anchor))
            {
                return BadRequest(new ProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "viewStart query (yyyy-MM-dd) is required."
                });
            }

            anchor = ScheduleService.GetMondayOfWeek(anchor);
            var view = await _scheduleService.UpdateStandardDaysAsync(currentUser, anchor, dto, cancellationToken);
            try
            {
                await _updatesBroadcaster.BroadcastScheduleUpdatedAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "SignalR schedule broadcast failed after settings update");
            }

            return Ok(view);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating schedule settings");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "Could not save standard raid days."
            });
        }
    }

    [HttpPut("week-comment")]
    public async Task<ActionResult<ScheduleViewDto>> UpsertWeekComment(
        [FromQuery] string viewStart,
        [FromBody] ScheduleWeekCommentUpsertDto dto,
        CancellationToken cancellationToken)
    {
        try
        {
            var currentUser = await this.GetCurrentUserAsync(_authService);
            if (currentUser == null)
                return Unauthorized();

            if (string.IsNullOrWhiteSpace(viewStart) || !DateOnly.TryParse(viewStart, out var anchor))
            {
                return BadRequest(new ProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "viewStart query (yyyy-MM-dd) is required."
                });
            }

            anchor = ScheduleService.GetMondayOfWeek(anchor);
            var view = await _scheduleService.UpsertWeekCommentAsync(currentUser, anchor, dto, cancellationToken);
            try
            {
                await _updatesBroadcaster.BroadcastScheduleUpdatedAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "SignalR schedule broadcast failed after week comment upsert");
            }

            return Ok(view);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
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
            _logger.LogError(ex, "Error updating schedule week comment");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "Could not save week comment."
            });
        }
    }
}
