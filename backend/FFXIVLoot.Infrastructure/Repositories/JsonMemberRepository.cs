using FFXIVLoot.Domain.Entities;
using FFXIVLoot.Domain.Interfaces;
using FFXIVLoot.Infrastructure.Storage;

namespace FFXIVLoot.Infrastructure.Repositories;

/// <summary>
/// JSON file-based repository for member data
/// </summary>
public class JsonMemberRepository : IMemberRepository
{
    private readonly JsonFileStorage _storage;
    private const string DefaultDataFilePath = "data/members.json";

    /// <summary>
    /// Initializes a new instance of JsonMemberRepository
    /// </summary>
    public JsonMemberRepository(string? dataFilePath = null)
    {
        var filePath = dataFilePath ?? DefaultDataFilePath;
        _storage = new JsonFileStorage(filePath);
    }

    /// <summary>
    /// Gets all members
    /// </summary>
    public async Task<List<Member>> GetAllAsync()
    {
        var data = await _storage.ReadAsync<DataModel>() ?? new DataModel();
        var members = data.Members;
        var needsSave = false;
        
        // Ensure all members have off spec lists, link states, and auth fields initialized (for backward compatibility)
        foreach (var member in members)
        {
            var memberNeedsUpdate = false;
            
            if (member.OffSpecBisItems == null)
            {
                member.OffSpecBisItems = new List<Domain.Entities.GearItem>();
                memberNeedsUpdate = true;
            }
            if (member.MainSpecLinkStates == null)
            {
                member.MainSpecLinkStates = new Dictionary<string, Dictionary<Domain.Enums.GearSlot, (bool, bool)>>();
                memberNeedsUpdate = true;
            }
            if (member.OffSpecLinkStates == null)
            {
                member.OffSpecLinkStates = new Dictionary<string, Dictionary<Domain.Enums.GearSlot, (bool, bool)>>();
                memberNeedsUpdate = true;
            }
            // Set Sandro as Administrator, others as User
            if (member.Name.Equals("Sandro", StringComparison.OrdinalIgnoreCase))
            {
                if (member.PermissionRole != Domain.Enums.PermissionRole.Administrator)
                {
                    member.PermissionRole = Domain.Enums.PermissionRole.Administrator;
                    memberNeedsUpdate = true;
                }
            }
            else if (member.PermissionRole == default(Domain.Enums.PermissionRole))
            {
                member.PermissionRole = Domain.Enums.PermissionRole.User;
                memberNeedsUpdate = true;
            }
            // Initialize PIN hash if not set (default PIN is 4444)
            if (string.IsNullOrEmpty(member.PinHash))
            {
                member.PinHash = Application.Helpers.PinHelper.HashPin(Application.Helpers.PinHelper.DefaultPin);
                memberNeedsUpdate = true;
            }
            
            if (memberNeedsUpdate)
            {
                needsSave = true;
            }
        }
        
        // Save changes if any members were updated
        if (needsSave)
        {
            await _storage.WriteAsync(data);
        }
        
        return members;
    }

    /// <summary>
    /// Gets a member by ID
    /// </summary>
    public async Task<Member?> GetByIdAsync(Guid id)
    {
        var members = await GetAllAsync();
        var member = members.FirstOrDefault(m => m.Id == id);
        
        // Note: GetAllAsync already handles initialization and persistence,
        // so we don't need to duplicate that logic here
        return member;
    }

    /// <summary>
    /// Creates a new member
    /// </summary>
    public async Task<Member> CreateAsync(Member member)
    {
        if (member == null)
        {
            throw new ArgumentNullException(nameof(member));
        }

        var data = await _storage.ReadAsync<DataModel>() ?? new DataModel();
        
        // Ensure member has an ID
        if (member.Id == Guid.Empty)
        {
            member.Id = Guid.NewGuid();
        }

        // Ensure default PIN is set if not provided
        if (string.IsNullOrEmpty(member.PinHash))
        {
            member.PinHash = Application.Helpers.PinHelper.HashPin(Application.Helpers.PinHelper.DefaultPin);
        }

        // Set Sandro as Administrator, others as User
        if (member.Name.Equals("Sandro", StringComparison.OrdinalIgnoreCase))
        {
            member.PermissionRole = Domain.Enums.PermissionRole.Administrator;
        }
        else if (member.PermissionRole == default(Domain.Enums.PermissionRole))
        {
            member.PermissionRole = Domain.Enums.PermissionRole.User;
        }

        data.Members.Add(member);
        await _storage.WriteAsync(data);
        
        return member;
    }

    /// <summary>
    /// Updates an existing member
    /// </summary>
    public async Task<Member> UpdateAsync(Member member)
    {
        if (member == null)
        {
            throw new ArgumentNullException(nameof(member));
        }

        var data = await _storage.ReadAsync<DataModel>() ?? new DataModel();
        var existingMember = data.Members.FirstOrDefault(m => m.Id == member.Id);
        
        if (existingMember == null)
        {
            throw new InvalidOperationException($"Member with ID {member.Id} not found");
        }

        // Update properties
        var index = data.Members.IndexOf(existingMember);
        data.Members[index] = member;
        
        await _storage.WriteAsync(data);
        
        return member;
    }

    /// <summary>
    /// Deletes a member by ID
    /// </summary>
    public async Task DeleteAsync(Guid id)
    {
        var data = await _storage.ReadAsync<DataModel>() ?? new DataModel();
        var member = data.Members.FirstOrDefault(m => m.Id == id);
        
        if (member != null)
        {
            data.Members.Remove(member);
            await _storage.WriteAsync(data);
        }
    }
}

