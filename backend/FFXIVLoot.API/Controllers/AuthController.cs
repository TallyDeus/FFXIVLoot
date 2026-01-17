using FFXIVLoot.Application.DTOs;
using FFXIVLoot.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace FFXIVLoot.API.Controllers;

/// <summary>
/// Controller for authentication
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthenticationService _authService;
    private readonly ILogger<AuthController> _logger;

    /// <summary>
    /// Initializes a new instance of AuthController
    /// </summary>
    public AuthController(IAuthenticationService authService, ILogger<AuthController> logger)
    {
        _authService = authService ?? throw new ArgumentNullException(nameof(authService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Logs in a user with member name and PIN
    /// </summary>
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginRequestDto request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.MemberName) || string.IsNullOrWhiteSpace(request.Pin))
            {
                return BadRequest(new ProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "Member name and PIN are required"
                });
            }

            var result = await _authService.LoginAsync(request);
            if (result == null)
            {
                return Unauthorized(new ProblemDetails
                {
                    Title = "Unauthorized",
                    Detail = "Invalid member name or PIN"
                });
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during login");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "An error occurred during login"
            });
        }
    }

    /// <summary>
    /// Logs out the current user
    /// </summary>
    [HttpPost("logout")]
    public IActionResult Logout()
    {
        var token = Request.Headers["Authorization"].FirstOrDefault()?.Replace("Bearer ", "");
        if (!string.IsNullOrEmpty(token))
        {
            _authService.Logout(token);
        }
        return NoContent();
    }

    /// <summary>
    /// Validates the current session token
    /// </summary>
    [HttpGet("validate")]
    public async Task<ActionResult<MemberDto>> Validate()
    {
        try
        {
            var token = Request.Headers["Authorization"].FirstOrDefault()?.Replace("Bearer ", "");
            var member = await _authService.GetMemberFromTokenAsync(token);
            
            if (member == null)
            {
                return Unauthorized(new ProblemDetails
                {
                    Title = "Unauthorized",
                    Detail = "Invalid or expired session"
                });
            }

            var memberDto = new MemberDto
            {
                Id = member.Id,
                Name = member.Name,
                Role = member.Role,
                XivGearLink = member.XivGearLink,
                BisItems = member.BisItems.Select(item => new GearItemDto
                {
                    Id = item.Id,
                    Slot = item.Slot,
                    ItemName = item.ItemName,
                    ItemType = item.ItemType,
                    IsAcquired = item.IsAcquired,
                    UpgradeMaterialAcquired = item.UpgradeMaterialAcquired
                }).ToList(),
                OffSpecXivGearLink = member.OffSpecXivGearLink,
                OffSpecBisItems = member.OffSpecBisItems.Select(item => new GearItemDto
                {
                    Id = item.Id,
                    Slot = item.Slot,
                    ItemName = item.ItemName,
                    ItemType = item.ItemType,
                    IsAcquired = item.IsAcquired,
                    UpgradeMaterialAcquired = item.UpgradeMaterialAcquired
                }).ToList(),
                PermissionRole = member.PermissionRole
            };

            return Ok(memberDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating session");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "An error occurred while validating session"
            });
        }
    }
}



