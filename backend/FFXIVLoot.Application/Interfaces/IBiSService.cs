using FFXIVLoot.Application.DTOs;
using FFXIVLoot.Domain.Enums;

namespace FFXIVLoot.Application.Interfaces;

/// <summary>
/// Service interface for managing best-in-slot lists
/// </summary>
public interface IBiSService
{
    /// <summary>
    /// Imports a best-in-slot list from a xivgear link
    /// </summary>
    Task<MemberDto> ImportBiSFromLinkAsync(XivGearImportRequest request);

    /// <summary>
    /// Marks a gear item as acquired for a member
    /// </summary>
    Task UpdateItemAcquisitionAsync(Guid memberId, GearSlot slot, bool isAcquired, SpecType specType = SpecType.MainSpec);

    /// <summary>
    /// Marks an upgrade material as acquired for a member
    /// </summary>
    Task UpdateUpgradeMaterialAcquisitionAsync(Guid memberId, GearSlot slot, bool upgradeMaterialAcquired, SpecType specType = SpecType.MainSpec);
}

