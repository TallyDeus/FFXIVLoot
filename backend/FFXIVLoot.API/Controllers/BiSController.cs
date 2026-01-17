using FFXIVLoot.Application.DTOs;
using FFXIVLoot.Application.Helpers;
using FFXIVLoot.Application.Interfaces;
using FFXIVLoot.API.Helpers;
using FFXIVLoot.Domain.Enums;
using Microsoft.AspNetCore.Mvc;

namespace FFXIVLoot.API.Controllers;

/// <summary>
/// Controller for managing best-in-slot lists
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class BiSController : ControllerBase
{
    private readonly IBiSService _bisService;
    private readonly IAuthenticationService _authService;
    private readonly IMemberService _memberService;
    private readonly ILogger<BiSController> _logger;

    /// <summary>
    /// Initializes a new instance of BiSController
    /// </summary>
    public BiSController(IBiSService bisService, IAuthenticationService authService, IMemberService memberService, ILogger<BiSController> logger)
    {
        _bisService = bisService ?? throw new ArgumentNullException(nameof(bisService));
        _authService = authService ?? throw new ArgumentNullException(nameof(authService));
        _memberService = memberService ?? throw new ArgumentNullException(nameof(memberService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Imports a best-in-slot list from a xivgear link
    /// </summary>
    [HttpPost("import")]
    public async Task<ActionResult<MemberDto>> ImportBiS([FromBody] XivGearImportRequest request)
    {
        try
        {
            _logger.LogInformation("BiS Import Request - MemberId: {MemberId}, SpecType: {SpecType}, Link: {Link}", 
                request.MemberId, request.SpecType, request.XivGearLink);
            var member = await _bisService.ImportBiSFromLinkAsync(request);
            return Ok(member);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid xivgear link provided");
            return BadRequest(new ProblemDetails
            {
                Title = "Bad Request",
                Detail = ex.Message
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Error importing BiS: {Error}", ex.Message);
            return NotFound(new ProblemDetails
            {
                Title = "Not Found",
                Detail = ex.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing BiS for member {MemberId}", request.MemberId);
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "An error occurred while importing the best-in-slot list"
            });
        }
    }

    /// <summary>
    /// Marks a gear item as acquired for a member
    /// </summary>
    [HttpPut("{memberId}/items/{slot}")]
    public async Task<IActionResult> UpdateItemAcquisition(Guid memberId, GearSlot slot, [FromBody] bool isAcquired, [FromQuery] SpecType? specType = null)
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

            var targetMemberDto = await _memberService.GetMemberByIdAsync(memberId);
            if (targetMemberDto == null)
            {
                return NotFound(new ProblemDetails
                {
                    Title = "Not Found",
                    Detail = $"Member with ID {memberId} not found"
                });
            }

            var targetEntity = new Domain.Entities.Member
            {
                Id = targetMemberDto.Id,
                PermissionRole = targetMemberDto.PermissionRole
            };

            if (!PermissionHelper.CanEditBiS(currentUser, targetEntity))
            {
                return Forbid();
            }

            await _bisService.UpdateItemAcquisitionAsync(memberId, slot, isAcquired, specType ?? SpecType.MainSpec);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Error updating item acquisition: {Error}", ex.Message);
            return NotFound(new ProblemDetails
            {
                Title = "Not Found",
                Detail = ex.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating item acquisition for member {MemberId}, slot {Slot}", memberId, slot);
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "An error occurred while updating item acquisition"
            });
        }
    }

    /// <summary>
    /// Marks an upgrade material as acquired for a member
    /// </summary>
    [HttpPut("{memberId}/items/{slot}/upgrade")]
    public async Task<IActionResult> UpdateUpgradeMaterialAcquisition(Guid memberId, GearSlot slot, [FromBody] bool upgradeMaterialAcquired, [FromQuery] SpecType? specType = null)
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

            var targetMemberDto = await _memberService.GetMemberByIdAsync(memberId);
            if (targetMemberDto == null)
            {
                return NotFound(new ProblemDetails
                {
                    Title = "Not Found",
                    Detail = $"Member with ID {memberId} not found"
                });
            }

            var targetEntity = new Domain.Entities.Member
            {
                Id = targetMemberDto.Id,
                PermissionRole = targetMemberDto.PermissionRole
            };

            if (!PermissionHelper.CanEditBiS(currentUser, targetEntity))
            {
                return Forbid();
            }

            await _bisService.UpdateUpgradeMaterialAcquisitionAsync(memberId, slot, upgradeMaterialAcquired, specType ?? SpecType.MainSpec);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Error updating upgrade material acquisition: {Error}", ex.Message);
            return BadRequest(new ProblemDetails
            {
                Title = "Bad Request",
                Detail = ex.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating upgrade material acquisition for member {MemberId}, slot {Slot}", memberId, slot);
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "An error occurred while updating upgrade material acquisition"
            });
        }
    }
}

