using FFXIVLoot.Application.DTOs;
using FFXIVLoot.Application.Helpers;
using FFXIVLoot.Application.Interfaces;
using FFXIVLoot.API.Helpers;
using Microsoft.AspNetCore.Mvc;
using System.IO;

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
    /// Uploads a profile image for a member
    /// </summary>
    [HttpPost("{id}/profile-image")]
    public async Task<ActionResult<string>> UploadProfileImage(Guid id, IFormFile file)
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

            // Users can only upload their own profile image, or Managers/Administrators can upload for anyone
            if (currentUser.Id != id && 
                !PermissionHelper.CanEditMember(currentUser, targetEntity))
            {
                return Forbid();
            }

            // Validate file
            if (file == null || file.Length == 0)
            {
                return BadRequest(new ProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "No file provided"
                });
            }

            // Validate file size (max 2MB)
            const long maxFileSize = 2 * 1024 * 1024; // 2MB
            if (file.Length > maxFileSize)
            {
                return BadRequest(new ProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "File size exceeds 2MB limit"
                });
            }

            // Validate file type (only images)
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
            var fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(fileExtension))
            {
                return BadRequest(new ProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "Invalid file type. Only JPG, PNG, GIF, and WebP images are allowed."
                });
            }

            // Create images directory if it doesn't exist
            var imagesPath = Path.Combine(Directory.GetCurrentDirectory(), "data", "images");
            if (!Directory.Exists(imagesPath))
            {
                Directory.CreateDirectory(imagesPath);
            }

            // Generate unique filename: {memberId}{extension}
            var fileName = $"{id}{fileExtension}";
            var filePath = Path.Combine(imagesPath, fileName);

            // Delete old image if it exists
            if (targetMemberDto.ProfileImageUrl != null)
            {
                var oldFileName = Path.GetFileName(targetMemberDto.ProfileImageUrl);
                var oldFilePath = Path.Combine(imagesPath, oldFileName);
                if (System.IO.File.Exists(oldFilePath) && oldFileName != fileName)
                {
                    try
                    {
                        System.IO.File.Delete(oldFilePath);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to delete old profile image for member {MemberId}", id);
                    }
                }
            }

            // Save new image
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Update member's profile image URL
            var imageUrl = $"/images/{fileName}";
            targetMemberDto.ProfileImageUrl = imageUrl;
            await _memberService.UpdateMemberAsync(targetMemberDto);

            return Ok(new { imageUrl });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading profile image for member {MemberId}", id);
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "An error occurred while uploading the profile image"
            });
        }
    }

    /// <summary>
    /// Deletes a member's profile image
    /// </summary>
    [HttpDelete("{id}/profile-image")]
    public async Task<IActionResult> DeleteProfileImage(Guid id)
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

            // Users can only delete their own profile image, or Managers/Administrators can delete for anyone
            if (currentUser.Id != id && 
                !PermissionHelper.CanEditMember(currentUser, targetEntity))
            {
                return Forbid();
            }

            // Delete image file if it exists
            if (!string.IsNullOrEmpty(targetMemberDto.ProfileImageUrl))
            {
                var imagesPath = Path.Combine(Directory.GetCurrentDirectory(), "data", "images");
                var fileName = Path.GetFileName(targetMemberDto.ProfileImageUrl);
                var filePath = Path.Combine(imagesPath, fileName);
                
                if (System.IO.File.Exists(filePath))
                {
                    try
                    {
                        System.IO.File.Delete(filePath);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to delete profile image file for member {MemberId}", id);
                    }
                }
            }

            // Update member to remove profile image URL
            targetMemberDto.ProfileImageUrl = null;
            await _memberService.UpdateMemberAsync(targetMemberDto);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting profile image for member {MemberId}", id);
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "An error occurred while deleting the profile image"
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

