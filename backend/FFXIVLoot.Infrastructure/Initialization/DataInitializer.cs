using FFXIVLoot.Domain.Entities;
using FFXIVLoot.Domain.Interfaces;

namespace FFXIVLoot.Infrastructure.Initialization;

/// <summary>
/// Utility for initializing default data
/// </summary>
public class DataInitializer
{
    private readonly IMemberRepository _memberRepository;

    /// <summary>
    /// Initializes a new instance of DataInitializer
    /// </summary>
    public DataInitializer(IMemberRepository memberRepository)
    {
        _memberRepository = memberRepository ?? throw new ArgumentNullException(nameof(memberRepository));
    }

    /// <summary>
    /// Initializes default raid members if the repository is empty
    /// </summary>
    public async Task InitializeDefaultMembersAsync()
    {
        var existingMembers = await _memberRepository.GetAllAsync();
        
        if (existingMembers.Any())
        {
            // Members already exist, skip initialization
            return;
        }

        var defaultMemberNames = new[]
        {
            "Elodie",
            "Illya",
            "Rami",
            "Renc",
            "Ryu",
            "Sasha",
            "Sandro",
            "Lob"
        };

        foreach (var name in defaultMemberNames)
        {
            var member = new Member
            {
                Name = name,
                BisItems = new List<GearItem>(),
                // PIN hash will be set automatically in CreateAsync
                // PermissionRole will be set automatically (Sandro = Admin, others = User)
            };

            await _memberRepository.CreateAsync(member);
        }
    }
}

