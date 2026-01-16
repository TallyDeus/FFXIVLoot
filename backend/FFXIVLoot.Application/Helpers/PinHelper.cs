using System.Security.Cryptography;
using System.Text;

namespace FFXIVLoot.Application.Helpers;

/// <summary>
/// Helper class for PIN hashing and verification
/// </summary>
public static class PinHelper
{
    /// <summary>
    /// Default PIN for new members
    /// </summary>
    public const string DefaultPin = "4444";

    /// <summary>
    /// Hashes a PIN using SHA256
    /// </summary>
    public static string HashPin(string pin)
    {
        using var sha256Hash = SHA256.Create();
        var bytes = sha256Hash.ComputeHash(Encoding.UTF8.GetBytes(pin));
        var builder = new StringBuilder();
        foreach (var b in bytes)
        {
            builder.Append(b.ToString("x2"));
        }
        return builder.ToString();
    }

    /// <summary>
    /// Verifies a PIN against a hash
    /// </summary>
    public static bool VerifyPin(string pin, string hash)
    {
        if (string.IsNullOrEmpty(hash))
        {
            // If no hash exists, check against default PIN
            return pin == DefaultPin;
        }
        return HashPin(pin) == hash;
    }
}


