using FFXIVLoot.Domain.Enums;

namespace FFXIVLoot.Application.DTOs;

/// <summary>
/// Lightweight member row for raid tier overview cards (read from tier members.json).
/// </summary>
public sealed class RaidTierMemberPreviewDto
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? ProfileImageUrl { get; set; }

    public bool IsActive { get; set; } = true;

    public MemberRole Role { get; set; } = MemberRole.DPS;
}
