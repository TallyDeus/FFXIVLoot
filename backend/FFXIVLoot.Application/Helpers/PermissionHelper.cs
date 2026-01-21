using FFXIVLoot.Domain.Entities;
using FFXIVLoot.Domain.Enums;

namespace FFXIVLoot.Application.Helpers;

/// <summary>
/// Helper class for checking permissions
/// </summary>
public static class PermissionHelper
{
    /// <summary>
    /// Checks if a user can edit a member
    /// </summary>
    public static bool CanEditMember(Member? currentUser, Member targetMember)
    {
        if (currentUser == null) return false;

        // Administrator can edit anyone
        if (currentUser.PermissionRole == PermissionRole.Administrator)
        {
            return true;
        }

        // Manager can edit anyone (but not their permission role - checked separately)
        if (currentUser.PermissionRole == PermissionRole.Manager)
        {
            return true;
        }

        // User can only edit themselves
        return currentUser.Id == targetMember.Id;
    }

    /// <summary>
    /// Checks if a user can edit a member's permission role
    /// </summary>
    public static bool CanEditPermissionRole(Member? currentUser, Member targetMember)
    {
        if (currentUser == null) return false;

        // Only Administrator can edit permission roles
        return currentUser.PermissionRole == PermissionRole.Administrator;
    }

    /// <summary>
    /// Checks if a user can edit BiS items for a member
    /// </summary>
    public static bool CanEditBiS(Member? currentUser, Member targetMember)
    {
        if (currentUser == null) return false;

        // Administrator and Manager can edit anyone's BiS
        if (currentUser.PermissionRole == PermissionRole.Administrator ||
            currentUser.PermissionRole == PermissionRole.Manager)
        {
            return true;
        }

        // User can only edit their own BiS
        return currentUser.Id == targetMember.Id;
    }

    /// <summary>
    /// Checks if a user can assign/undo loot
    /// </summary>
    public static bool CanAssignLoot(Member? currentUser)
    {
        if (currentUser == null) return false;

        // Administrator and Manager can assign loot
        return currentUser.PermissionRole == PermissionRole.Administrator ||
               currentUser.PermissionRole == PermissionRole.Manager;
    }

    /// <summary>
    /// Checks if a user can create weeks
    /// </summary>
    public static bool CanCreateWeek(Member? currentUser)
    {
        if (currentUser == null) return false;

        // Administrator and Manager can create weeks
        return currentUser.PermissionRole == PermissionRole.Administrator ||
               currentUser.PermissionRole == PermissionRole.Manager;
    }

    /// <summary>
    /// Checks if a user can delete weeks
    /// </summary>
    public static bool CanDeleteWeek(Member? currentUser)
    {
        if (currentUser == null) return false;

        // Only Administrator can delete weeks
        return currentUser.PermissionRole == PermissionRole.Administrator;
    }
}





