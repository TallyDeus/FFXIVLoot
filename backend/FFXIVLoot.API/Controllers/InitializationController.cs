using FFXIVLoot.Infrastructure.Initialization;
using Microsoft.AspNetCore.Mvc;

namespace FFXIVLoot.API.Controllers;

/// <summary>
/// Controller for initializing default data
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class InitializationController : ControllerBase
{
    private readonly DataInitializer _dataInitializer;
    private readonly WeekDataInitializer _weekDataInitializer;
    private readonly ILogger<InitializationController> _logger;

    /// <summary>
    /// Initializes a new instance of InitializationController
    /// </summary>
    public InitializationController(
        DataInitializer dataInitializer,
        WeekDataInitializer weekDataInitializer,
        ILogger<InitializationController> logger)
    {
        _dataInitializer = dataInitializer ?? throw new ArgumentNullException(nameof(dataInitializer));
        _weekDataInitializer = weekDataInitializer ?? throw new ArgumentNullException(nameof(weekDataInitializer));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Initializes default raid members
    /// </summary>
    [HttpPost("default-members")]
    public async Task<IActionResult> InitializeDefaultMembers()
    {
        try
        {
            await _dataInitializer.InitializeDefaultMembersAsync();
            return Ok(new { message = "Default members initialized successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error initializing default members");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "An error occurred while initializing default members"
            });
        }
    }

    /// <summary>
    /// Initializes historical week data
    /// </summary>
    [HttpPost("weeks")]
    public async Task<IActionResult> InitializeWeeks()
    {
        try
        {
            await _weekDataInitializer.InitializeHistoricalDataAsync();
            return Ok(new { message = "Historical week data initialized successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error initializing historical week data");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "An error occurred while initializing historical week data"
            });
        }
    }
}

