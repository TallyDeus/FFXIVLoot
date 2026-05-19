namespace FFXIVLoot.Domain.Enums;

/// <summary>
/// Permission roles for members
/// </summary>
public enum PermissionRole
{
    /// <summary>
    /// Standard user with limited permissions
    /// </summary>
    User = 0,

    /// <summary>
    /// Manager with elevated permissions
    /// </summary>
    Manager = 1,

    /// <summary>
    /// Administrator with full access
    /// </summary>
    Administrator = 2,

    /// <summary>
    /// Read-only guest: can view app data but cannot edit; excluded from BiS tracker and schedule roster.
    /// </summary>
    Guest = 3
}





