using FFXIVLoot.Application.DTOs;
using FFXIVLoot.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace FFXIVLoot.API.Controllers;

/// <summary>
/// Controller for retrieving loot assignment history
/// </summary>
[ApiController]
[Route("api/loot-history")]
public class LootHistoryController : ControllerBase
{
    private readonly ILootHistoryService _historyService;
    private readonly ILogger<LootHistoryController> _logger;

    /// <summary>
    /// Initializes a new instance of LootHistoryController
    /// </summary>
    public LootHistoryController(ILootHistoryService historyService, ILogger<LootHistoryController> logger)
    {
        _historyService = historyService ?? throw new ArgumentNullException(nameof(historyService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Gets all assignment history grouped by week
    /// </summary>
    [HttpGet("weeks")]
    public async Task<ActionResult<List<WeekAssignmentHistoryDto>>> GetAllHistory()
    {
        try
        {
            var history = await _historyService.GetAllHistoryGroupedByWeekAsync();
            return Ok(history);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting loot history");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "An error occurred while retrieving loot history"
            });
        }
    }

    /// <summary>
    /// Gets assignment history for a specific week
    /// </summary>
    [HttpGet("weeks/{weekNumber}")]
    public async Task<ActionResult<WeekAssignmentHistoryDto>> GetHistoryForWeek(int weekNumber)
    {
        try
        {
            var history = await _historyService.GetHistoryForWeekAsync(weekNumber);
            if (history == null)
            {
                return NotFound(new ProblemDetails
                {
                    Title = "Not Found",
                    Detail = $"No history found for week {weekNumber}"
                });
            }
            return Ok(history);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting loot history for week {WeekNumber}", weekNumber);
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "An error occurred while retrieving loot history"
            });
        }
    }
}

