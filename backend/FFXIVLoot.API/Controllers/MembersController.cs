using FFXIVLoot.Application.DTOs;
using FFXIVLoot.Application.Helpers;
using FFXIVLoot.Application.Interfaces;
using FFXIVLoot.API.Helpers;
using Microsoft.AspNetCore.Mvc;

namespace FFXIVLoot.API.Controllers;

/// <summary>
/// Controller for managing raid members
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class MembersController : ControllerBase
{
    private readonly IMemberService _memberService;
    private readonly IAuthenticationService _authService;
    private readonly ILogger<MembersController> _logger;

    /// <summary>
    /// Initializes a new instance of MembersController
    /// </summary>
    public MembersController(IMemberService memberService, IAuthenticationService authService, ILogger<MembersController> logger)
    {
        _memberService = memberService ?? throw new ArgumentNullException(nameof(memberService));
        _authService = authService ?? throw new ArgumentNullException(nameof(authService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Gets all members
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<MemberDto>>> GetAllMembers()
    {
        try
        {
            var members = await _memberService.GetAllMembersAsync();
            return Ok(members);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all members");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "An error occurred while retrieving members"
            });
        }
    }

    /// <summary>
    /// Gets a member by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<MemberDto>> GetMember(Guid id)
    {
        try
        {
            var member = await _memberService.GetMemberByIdAsync(id);
            if (member == null)
            {
                return NotFound(new ProblemDetails
                {
                    Title = "Not Found",
                    Detail = $"Member with ID {id} not found"
                });
            }

            return Ok(member);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting member {MemberId}", id);
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "An error occurred while retrieving the member"
            });
        }
    }

    /// <summary>
    /// Creates a new member
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<MemberDto>> CreateMember([FromBody] MemberDto memberDto)
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

            // Only Administrator and Manager can create members
            if (currentUser.PermissionRole != Domain.Enums.PermissionRole.Administrator &&
                currentUser.PermissionRole != Domain.Enums.PermissionRole.Manager)
            {
                return Forbid();
            }

            var createdMember = await _memberService.CreateMemberAsync(memberDto);
            return CreatedAtAction(nameof(GetMember), new { id = createdMember.Id }, createdMember);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating member");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "An error occurred while creating the member"
            });
        }
    }

    /// <summary>
    /// Updates an existing member
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<MemberDto>> UpdateMember(Guid id, [FromBody] MemberDto memberDto)
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

            if (id != memberDto.Id)
            {
                return BadRequest(new ProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "Member ID in URL does not match ID in body"
                });
            }

            // Get target member to check permissions
            var targetMemberDto = await _memberService.GetMemberByIdAsync(id);
            if (targetMemberDto == null)
            {
                return NotFound(new ProblemDetails
                {
                    Title = "Not Found",
                    Detail = $"Member with ID {id} not found"
                });
            }

            // Convert DTO to entity for permission check
            var targetEntity = new Domain.Entities.Member
            {
                Id = targetMemberDto.Id,
                PermissionRole = targetMemberDto.PermissionRole
            };

            if (!PermissionHelper.CanEditMember(currentUser, targetEntity))
            {
                return Forbid();
            }

            // Check if user is trying to change permission role
            if (memberDto.PermissionRole != targetMemberDto.PermissionRole)
            {
                if (!PermissionHelper.CanEditPermissionRole(currentUser, targetEntity))
                {
                    return Forbid();
                }
            }

            var updatedMember = await _memberService.UpdateMemberAsync(memberDto);
            return Ok(updatedMember);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Member not found for update {MemberId}", id);
            return NotFound(new ProblemDetails
            {
                Title = "Not Found",
                Detail = ex.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating member {MemberId}", id);
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "An error occurred while updating the member"
            });
        }
    }

    /// <summary>
    /// Deletes a member by ID
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteMember(Guid id)
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

            // Only Administrator can delete members
            if (currentUser.PermissionRole != Domain.Enums.PermissionRole.Administrator)
            {
                return Forbid();
            }

            await _memberService.DeleteMemberAsync(id);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting member {MemberId}", id);
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "An error occurred while deleting the member"
            });
        }
    }

    /// <summary>
    /// Updates a member's PIN
    /// </summary>
    [HttpPut("{id}/pin")]
    public async Task<IActionResult> UpdatePin(Guid id, [FromBody] UpdatePinRequestDto request)
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

            // Users can only update their own PIN
            if (currentUser.Id != id)
            {
                return Forbid();
            }

            await _memberService.UpdatePinAsync(id, request.CurrentPin, request.NewPin);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Invalid PIN for member {MemberId}", id);
            return Unauthorized(new ProblemDetails
            {
                Title = "Unauthorized",
                Detail = ex.Message
            });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid PIN format for member {MemberId}", id);
            return BadRequest(new ProblemDetails
            {
                Title = "Bad Request",
                Detail = ex.Message
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Member not found for PIN update {MemberId}", id);
            return NotFound(new ProblemDetails
            {
                Title = "Not Found",
                Detail = ex.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating PIN for member {MemberId}", id);
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "An error occurred while updating the PIN"
            });
        }
    }
}

