using FFXIVLoot.Application.DTOs;
using FFXIVLoot.Application.Helpers;
using FFXIVLoot.Domain.Interfaces;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.DependencyInjection;

using FFXIVLoot.Application.Interfaces;

namespace FFXIVLoot.Application.Services;

/// <summary>
/// Service for handling authentication
/// </summary>
public class AuthenticationService : IAuthenticationService
{
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly Dictionary<string, (Guid MemberId, DateTime ExpiresAt)> _activeSessions = new();

    /// <summary>
    /// Initializes a new instance of AuthenticationService
    /// </summary>
    public AuthenticationService(IServiceScopeFactory serviceScopeFactory)
    {
        _serviceScopeFactory = serviceScopeFactory ?? throw new ArgumentNullException(nameof(serviceScopeFactory));
        
        // Clean up expired sessions periodically
        _ = Task.Run(async () =>
        {
            while (true)
            {
                await Task.Delay(TimeSpan.FromMinutes(5));
                CleanupExpiredSessions();
            }
        });
    }

    /// <summary>
    /// Authenticates a user with member name and PIN
    /// </summary>
    public async Task<LoginResponseDto?> LoginAsync(LoginRequestDto request)
    {
        using var scope = _serviceScopeFactory.CreateScope();
        var memberRepository = scope.ServiceProvider.GetRequiredService<IMemberRepository>();
        
        var members = await memberRepository.GetAllAsync();
        var member = members.FirstOrDefault(m => 
            m.Name.Equals(request.MemberName, StringComparison.OrdinalIgnoreCase));

        if (member == null)
        {
            return null;
        }

        // Verify PIN
        var isValidPin = PinHelper.VerifyPin(request.Pin, member.PinHash);
        if (!isValidPin)
        {
            return null;
        }

        // Generate session token
        var token = GenerateToken();
        var expiresAt = DateTime.UtcNow.AddHours(24); // 24 hour session

        _activeSessions[token] = (member.Id, expiresAt);

        // Map to DTO
        var memberDto = new MemberDto
        {
            Id = member.Id,
            Name = member.Name,
            Role = member.Role,
            XivGearLink = member.XivGearLink,
            BisItems = member.BisItems.Select(MapGearItemToDto).ToList(),
            OffSpecXivGearLink = member.OffSpecXivGearLink,
            OffSpecBisItems = member.OffSpecBisItems.Select(MapGearItemToDto).ToList(),
            PermissionRole = member.PermissionRole
        };

        return new LoginResponseDto
        {
            Member = memberDto,
            Token = token
        };
    }

    /// <summary>
    /// Validates a session token and returns the member ID
    /// </summary>
    public Guid? ValidateToken(string? token)
    {
        if (string.IsNullOrEmpty(token))
        {
            return null;
        }

        if (!_activeSessions.TryGetValue(token, out var session))
        {
            // Log for debugging - token not found
            System.Diagnostics.Debug.WriteLine($"Token not found in active sessions. Token: {token.Substring(0, Math.Min(10, token.Length))}..., Active sessions: {_activeSessions.Count}");
            return null;
        }

        if (session.ExpiresAt < DateTime.UtcNow)
        {
            _activeSessions.Remove(token);
            System.Diagnostics.Debug.WriteLine($"Token expired. ExpiresAt: {session.ExpiresAt}, Now: {DateTime.UtcNow}");
            return null;
        }

        return session.MemberId;
    }

    /// <summary>
    /// Logs out a user by invalidating their token
    /// </summary>
    public void Logout(string token)
    {
        _activeSessions.Remove(token);
    }

    /// <summary>
    /// Gets the member associated with a token
    /// </summary>
    public async Task<Domain.Entities.Member?> GetMemberFromTokenAsync(string? token)
    {
        if (string.IsNullOrEmpty(token))
        {
            return null;
        }
        
        var memberId = ValidateToken(token);
        if (!memberId.HasValue)
        {
            // Log for debugging - token not found in active sessions
            System.Diagnostics.Debug.WriteLine($"Token validation failed. Token length: {token?.Length ?? 0}, Active sessions count: {_activeSessions.Count}");
            return null;
        }

        using var scope = _serviceScopeFactory.CreateScope();
        var memberRepository = scope.ServiceProvider.GetRequiredService<IMemberRepository>();
        return await memberRepository.GetByIdAsync(memberId.Value);
    }

    private void CleanupExpiredSessions()
    {
        var expiredTokens = _activeSessions
            .Where(kvp => kvp.Value.ExpiresAt < DateTime.UtcNow)
            .Select(kvp => kvp.Key)
            .ToList();

        foreach (var token in expiredTokens)
        {
            _activeSessions.Remove(token);
        }
    }

    private static string GenerateToken()
    {
        var bytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes);
    }

    private static GearItemDto MapGearItemToDto(Domain.Entities.GearItem item)
    {
        return new GearItemDto
        {
            Id = item.Id,
            Slot = item.Slot,
            ItemName = item.ItemName,
            ItemType = item.ItemType,
            IsAcquired = item.IsAcquired,
            UpgradeMaterialAcquired = item.UpgradeMaterialAcquired
        };
    }
}

