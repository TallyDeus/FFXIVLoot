using System.Text.Json;
using FFXIVLoot.Application.DTOs;
using FFXIVLoot.Application.Interfaces;
using FFXIVLoot.Domain.Entities;
using FFXIVLoot.Domain.Enums;
using FFXIVLoot.Infrastructure.Storage;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace FFXIVLoot.Infrastructure.Services;

/// <summary>
/// Manages raid-tiers-index.json, legacy migration, and per-tier data directories.
/// </summary>
public sealed class RaidTierManagementService : IRaidTierManagement
{
    private static readonly string[] LegacyRootJsonNames = ["members.json", "weeks.json", "loot-assignments.json"];

    private readonly SemaphoreSlim _mutex = new(1, 1);
    private readonly ILogger<RaidTierManagementService> _logger;
    private readonly string? _configuredInitialTierName;
    private readonly string _indexPath;

    public string DataRoot { get; }

    public RaidTierManagementService(ILogger<RaidTierManagementService> logger, IConfiguration configuration)
    {
        _logger = logger;
        _configuredInitialTierName = configuration["RaidTier:InitialTierName"];
        DataRoot = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "data"));
        _indexPath = Path.Combine(DataRoot, "raid-tiers-index.json");
    }

    public async Task EnsureInitializedAsync(CancellationToken cancellationToken = default)
    {
        await _mutex.WaitAsync(cancellationToken);
        try
        {
            Directory.CreateDirectory(DataRoot);

            if (File.Exists(_indexPath))
                return;

            var tierId = Guid.NewGuid();
            var tierDir = GetTierDirectory(tierId);
            Directory.CreateDirectory(tierDir);

            var legacyMembers = Path.Combine(DataRoot, "members.json");
            var legacyWeeks = Path.Combine(DataRoot, "weeks.json");
            var legacyLoot = Path.Combine(DataRoot, "loot-assignments.json");

            var hasLegacy = File.Exists(legacyMembers) || File.Exists(legacyWeeks) || File.Exists(legacyLoot);

            if (File.Exists(legacyMembers))
            {
                File.Move(legacyMembers, Path.Combine(tierDir, "members.json"));
            }
            else
            {
                await WriteMembersFileAsync(tierDir, new DataModel { SchemaVersion = 2 });
            }

            if (File.Exists(legacyWeeks))
            {
                File.Move(legacyWeeks, Path.Combine(tierDir, "weeks.json"));
            }
            else
            {
                await WriteWeeksFileAsync(tierDir, new WeekDataModel());
            }

            if (File.Exists(legacyLoot))
            {
                File.Move(legacyLoot, Path.Combine(tierDir, "loot-assignments.json"));
            }
            else
            {
                await WriteLootFileAsync(tierDir, new LootAssignmentDataModel());
            }

            var legacySchedule = Path.Combine(DataRoot, "schedule.json");
            if (File.Exists(legacySchedule))
            {
                File.Move(legacySchedule, Path.Combine(tierDir, "schedule.json"));
            }
            else
            {
                await WriteScheduleFileAsync(tierDir, new ScheduleFileData());
            }

            var tierName = !string.IsNullOrWhiteSpace(_configuredInitialTierName)
                ? _configuredInitialTierName.Trim()
                : hasLegacy
                    ? "Imported"
                    : "Default";
            var state = new RaidTierIndexState
            {
                CurrentRaidTierId = tierId,
                RaidTiers =
                {
                    new RaidTier
                    {
                        Id = tierId,
                        Name = tierName,
                        CreatedAtUtc = DateTime.UtcNow
                    }
                }
            };

            await WriteIndexFileAsync(state);
            _logger.LogInformation("Raid tier storage initialized (tier {TierId}, name {TierName}).", tierId, tierName);
        }
        finally
        {
            _mutex.Release();
        }
    }

    public async Task<Guid> GetCurrentTierIdAsync(CancellationToken cancellationToken = default)
    {
        await EnsureInitializedAsync(cancellationToken);
        await _mutex.WaitAsync(cancellationToken);
        try
        {
            var state = await ReadIndexFileAsync();
            return state.CurrentRaidTierId;
        }
        finally
        {
            _mutex.Release();
        }
    }

    /// <inheritdoc />
    public async Task<bool> TierExistsAsync(Guid tierId, CancellationToken cancellationToken = default)
    {
        await EnsureInitializedAsync(cancellationToken);
        await _mutex.WaitAsync(cancellationToken);
        try
        {
            var state = await ReadIndexFileAsync();
            return state.RaidTiers.Exists(t => t.Id == tierId);
        }
        finally
        {
            _mutex.Release();
        }
    }

    public async Task<IReadOnlyList<RaidTierSummaryDto>> ListTiersAsync(CancellationToken cancellationToken = default)
    {
        await EnsureInitializedAsync(cancellationToken);
        await _mutex.WaitAsync(cancellationToken);
        try
        {
            var state = await ReadIndexFileAsync();
            return state.RaidTiers
                .OrderByDescending(t => t.CreatedAtUtc)
                .Select(t => new RaidTierSummaryDto
                {
                    Id = t.Id,
                    Name = t.Name,
                    CreatedAtUtc = t.CreatedAtUtc,
                    IsCurrent = t.Id == state.CurrentRaidTierId
                })
                .ToList();
        }
        finally
        {
            _mutex.Release();
        }
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<RaidTierOverviewDto>> ListTiersWithOverviewAsync(
        CancellationToken cancellationToken = default)
    {
        await EnsureInitializedAsync(cancellationToken);
        List<(Guid Id, string Name, DateTime CreatedUtc, bool IsCurrent)> rows;
        await _mutex.WaitAsync(cancellationToken);
        try
        {
            var state = await ReadIndexFileAsync();
            rows = state.RaidTiers
                .OrderByDescending(t => t.CreatedAtUtc)
                .Select(t => (t.Id, t.Name, t.CreatedAtUtc, t.Id == state.CurrentRaidTierId))
                .ToList();
        }
        finally
        {
            _mutex.Release();
        }

        var results = new List<RaidTierOverviewDto>();
        foreach (var row in rows)
        {
            var preview = await LoadTierPreviewFromDiskAsync(row.Id, cancellationToken);
            results.Add(new RaidTierOverviewDto
            {
                Id = row.Id,
                Name = row.Name,
                CreatedAtUtc = row.CreatedUtc,
                IsCurrent = row.IsCurrent,
                Members = preview.Members.ToList(),
                WeekCount = preview.WeekCount,
                ActiveWeekNumber = preview.ActiveWeekNumber,
                LootAssignmentCount = preview.LootAssignmentCount,
                ActiveLootAssignmentCount = preview.ActiveLootAssignmentCount
            });
        }

        return results;
    }

    private sealed record TierDiskPreview(
        IReadOnlyList<RaidTierMemberPreviewDto> Members,
        int WeekCount,
        int ActiveWeekNumber,
        int LootAssignmentCount,
        int ActiveLootAssignmentCount);

    private async Task<TierDiskPreview> LoadTierPreviewFromDiskAsync(Guid tierId, CancellationToken cancellationToken)
    {
        try
        {
            var dir = GetTierDirectory(tierId);
            if (!Directory.Exists(dir))
                return new TierDiskPreview(Array.Empty<RaidTierMemberPreviewDto>(), 0, 0, 0, 0);

            IReadOnlyList<RaidTierMemberPreviewDto> memberPreviews = Array.Empty<RaidTierMemberPreviewDto>();
            var membersPath = Path.Combine(dir, "members.json");
            if (File.Exists(membersPath))
            {
                var json = await File.ReadAllTextAsync(membersPath, cancellationToken);
                if (!string.IsNullOrWhiteSpace(json))
                {
                    var dm = JsonSerializer.Deserialize<DataModel>(json, JsonFileStorage.StorageJsonOptions);
                    if (dm?.Members is { Count: > 0 })
                    {
                        memberPreviews = dm.Members
                            .OrderBy(m => m.Name, StringComparer.OrdinalIgnoreCase)
                            .Select(m => new RaidTierMemberPreviewDto
                            {
                                Id = m.Id,
                                Name = m.Name,
                                ProfileImageUrl = m.ProfileImageUrl,
                                IsActive = m.IsActive,
                                Role = m.Role
                            })
                            .ToList();
                    }
                }
            }

            var weekCount = 0;
            var activeWeekNumber = 0;
            var weeksPath = Path.Combine(dir, "weeks.json");
            if (File.Exists(weeksPath))
            {
                var json = await File.ReadAllTextAsync(weeksPath, cancellationToken);
                if (!string.IsNullOrWhiteSpace(json))
                {
                    var wm = JsonSerializer.Deserialize<WeekDataModel>(json, JsonFileStorage.StorageJsonOptions);
                    if (wm != null)
                    {
                        weekCount = wm.Weeks.Count;
                        activeWeekNumber = wm.CurrentWeekNumber;
                    }
                }
            }

            var lootTotal = 0;
            var lootActive = 0;
            var lootPath = Path.Combine(dir, "loot-assignments.json");
            if (File.Exists(lootPath))
            {
                var json = await File.ReadAllTextAsync(lootPath, cancellationToken);
                if (!string.IsNullOrWhiteSpace(json))
                {
                    var lm = JsonSerializer.Deserialize<LootAssignmentDataModel>(json, JsonFileStorage.StorageJsonOptions);
                    if (lm?.Assignments != null)
                    {
                        lootTotal = lm.Assignments.Count;
                        lootActive = lm.Assignments.Count(a => !a.IsUndone);
                    }
                }
            }

            return new TierDiskPreview(
                memberPreviews,
                weekCount,
                activeWeekNumber,
                lootTotal,
                lootActive);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to read raid tier preview from disk for {TierId}", tierId);
            return new TierDiskPreview(Array.Empty<RaidTierMemberPreviewDto>(), 0, 0, 0, 0);
        }
    }

    public async Task<RaidTierSummaryDto?> GetCurrentTierAsync(CancellationToken cancellationToken = default)
    {
        await EnsureInitializedAsync(cancellationToken);
        await _mutex.WaitAsync(cancellationToken);
        try
        {
            var state = await ReadIndexFileAsync();
            var t = state.RaidTiers.FirstOrDefault(x => x.Id == state.CurrentRaidTierId);
            if (t == null)
                return null;
            return new RaidTierSummaryDto
            {
                Id = t.Id,
                Name = t.Name,
                CreatedAtUtc = t.CreatedAtUtc,
                IsCurrent = true
            };
        }
        finally
        {
            _mutex.Release();
        }
    }

    public async Task SetCurrentTierAsync(Guid tierId, CancellationToken cancellationToken = default)
    {
        await EnsureInitializedAsync(cancellationToken);
        await _mutex.WaitAsync(cancellationToken);
        try
        {
            var state = await ReadIndexFileAsync();
            if (state.RaidTiers.All(t => t.Id != tierId))
                throw new InvalidOperationException($"Raid tier {tierId} was not found.");

            state.CurrentRaidTierId = tierId;
            await WriteIndexFileAsync(state);
        }
        finally
        {
            _mutex.Release();
        }
    }

    public async Task<RaidTierSummaryDto> CreateTierAsync(string name, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Tier name is required.", nameof(name));

        await EnsureInitializedAsync(cancellationToken);
        await _mutex.WaitAsync(cancellationToken);
        try
        {
            var state = await ReadIndexFileAsync();
            var sourceDir = GetTierDirectory(state.CurrentRaidTierId);
            var sourceMembersPath = Path.Combine(sourceDir, "members.json");

            DataModel sourceData;
            if (File.Exists(sourceMembersPath))
            {
                var json = await File.ReadAllTextAsync(sourceMembersPath, cancellationToken);
                sourceData = string.IsNullOrWhiteSpace(json)
                    ? new DataModel { SchemaVersion = 2 }
                    : JsonSerializer.Deserialize<DataModel>(json, JsonFileStorage.StorageJsonOptions) ?? new DataModel { SchemaVersion = 2 };
            }
            else
            {
                sourceData = new DataModel { SchemaVersion = 2 };
            }

            if (sourceData.SchemaVersion < 2)
            {
                foreach (var m in sourceData.Members)
                    m.IsActive = true;
                sourceData.SchemaVersion = 2;
            }

            var newTierId = Guid.NewGuid();
            var newDir = GetTierDirectory(newTierId);
            Directory.CreateDirectory(newDir);

            var cloned = new DataModel { SchemaVersion = 2 };
            foreach (var m in sourceData.Members)
            {
                cloned.Members.Add(CloneMemberForNewTier(m));
            }

            for (var i = 0; i < sourceData.Members.Count; i++)
            {
                var newUrl = CopyProfileImageFileIfExists(sourceData.Members[i].ProfileImageUrl, cloned.Members[i].Id);
                if (newUrl != null)
                    cloned.Members[i].ProfileImageUrl = newUrl;
            }

            await WriteMembersFileAsync(newDir, cloned);
            await WriteWeeksFileAsync(newDir, new WeekDataModel());
            await WriteLootFileAsync(newDir, new LootAssignmentDataModel());

            ScheduleFileData scheduleForNewTier;
            var sourceSchedulePath = Path.Combine(sourceDir, "schedule.json");
            if (File.Exists(sourceSchedulePath))
            {
                var sj = await File.ReadAllTextAsync(sourceSchedulePath, cancellationToken);
                var parsed = string.IsNullOrWhiteSpace(sj)
                    ? null
                    : JsonSerializer.Deserialize<ScheduleFileData>(sj, JsonFileStorage.StorageJsonOptions);
                scheduleForNewTier = RemapScheduleMemberIds(parsed, sourceData.Members, cloned.Members);
            }
            else
            {
                scheduleForNewTier = new ScheduleFileData();
            }

            await WriteScheduleFileAsync(newDir, scheduleForNewTier);

            var tier = new RaidTier
            {
                Id = newTierId,
                Name = name.Trim(),
                CreatedAtUtc = DateTime.UtcNow
            };
            state.RaidTiers.Add(tier);
            state.CurrentRaidTierId = newTierId;
            await WriteIndexFileAsync(state);

            return new RaidTierSummaryDto
            {
                Id = tier.Id,
                Name = tier.Name,
                CreatedAtUtc = tier.CreatedAtUtc,
                IsCurrent = true
            };
        }
        finally
        {
            _mutex.Release();
        }
    }

    public async Task DeleteTierAsync(Guid tierId, CancellationToken cancellationToken = default)
    {
        await EnsureInitializedAsync(cancellationToken);
        await _mutex.WaitAsync(cancellationToken);
        try
        {
            var state = await ReadIndexFileAsync();
            var tier = state.RaidTiers.FirstOrDefault(t => t.Id == tierId);
            if (tier == null)
                throw new InvalidOperationException($"Raid tier {tierId} was not found.");

            if (state.RaidTiers.Count <= 1)
                throw new InvalidOperationException("Cannot delete the only remaining raid tier.");

            state.RaidTiers.Remove(tier);

            if (state.CurrentRaidTierId == tierId)
            {
                state.CurrentRaidTierId = state.RaidTiers.OrderByDescending(t => t.CreatedAtUtc).First().Id;
            }

            await WriteIndexFileAsync(state);

            var dir = GetTierDirectory(tierId);
            if (Directory.Exists(dir))
            {
                try
                {
                    Directory.Delete(dir, recursive: true);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to delete raid tier directory {Dir}", dir);
                    throw;
                }
            }
        }
        finally
        {
            _mutex.Release();
        }
    }

    /// <inheritdoc />
    public async Task<RaidTierSummaryDto> RenameTierAsync(Guid tierId, string newName, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(newName))
            throw new ArgumentException("Tier name is required.", nameof(newName));

        await EnsureInitializedAsync(cancellationToken);
        await _mutex.WaitAsync(cancellationToken);
        try
        {
            var state = await ReadIndexFileAsync();
            var tier = state.RaidTiers.FirstOrDefault(t => t.Id == tierId);
            if (tier == null)
                throw new InvalidOperationException($"Raid tier {tierId} was not found.");

            tier.Name = newName.Trim();
            await WriteIndexFileAsync(state);

            return new RaidTierSummaryDto
            {
                Id = tier.Id,
                Name = tier.Name,
                CreatedAtUtc = tier.CreatedAtUtc,
                IsCurrent = tier.Id == state.CurrentRaidTierId
            };
        }
        finally
        {
            _mutex.Release();
        }
    }

    /// <inheritdoc />
    public async Task<LegacyRootDataStatusDto> GetLegacyRootDataStatusAsync(CancellationToken cancellationToken = default)
    {
        await EnsureInitializedAsync(cancellationToken);
        var fileNames = LegacyRootJsonNames
            .Where(n => File.Exists(Path.Combine(DataRoot, n)))
            .ToList();
        return new LegacyRootDataStatusDto
        {
            HasLegacyFiles = fileNames.Count > 0,
            FileNames = fileNames
        };
    }

    /// <inheritdoc />
    public async Task<RaidTierSummaryDto> ImportRootJsonFilesAsNewTierAsync(string name, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Tier name is required.", nameof(name));

        await EnsureInitializedAsync(cancellationToken);
        await _mutex.WaitAsync(cancellationToken);
        try
        {
            var present = LegacyRootJsonNames.Where(n => File.Exists(Path.Combine(DataRoot, n))).ToList();
            if (present.Count == 0)
            {
                throw new InvalidOperationException(
                    "No members.json, weeks.json, or loot-assignments.json found in the data folder root.");
            }

            var state = await ReadIndexFileAsync();
            var newTierId = Guid.NewGuid();
            var newDir = GetTierDirectory(newTierId);
            Directory.CreateDirectory(newDir);

            MoveRootJsonIfExists("members.json", newDir);
            if (!File.Exists(Path.Combine(newDir, "members.json")))
                await WriteMembersFileAsync(newDir, new DataModel { SchemaVersion = 2 });

            MoveRootJsonIfExists("weeks.json", newDir);
            if (!File.Exists(Path.Combine(newDir, "weeks.json")))
                await WriteWeeksFileAsync(newDir, new WeekDataModel());

            MoveRootJsonIfExists("loot-assignments.json", newDir);
            if (!File.Exists(Path.Combine(newDir, "loot-assignments.json")))
                await WriteLootFileAsync(newDir, new LootAssignmentDataModel());

            MoveRootJsonIfExists("schedule.json", newDir);
            if (!File.Exists(Path.Combine(newDir, "schedule.json")))
                await WriteScheduleFileAsync(newDir, new ScheduleFileData());

            var tier = new RaidTier
            {
                Id = newTierId,
                Name = name.Trim(),
                CreatedAtUtc = DateTime.UtcNow
            };
            state.RaidTiers.Add(tier);
            state.CurrentRaidTierId = newTierId;
            await WriteIndexFileAsync(state);

            _logger.LogInformation(
                "Imported root JSON files ({Files}) into new raid tier {TierId} ({Name}).",
                string.Join(", ", present),
                newTierId,
                tier.Name);

            return new RaidTierSummaryDto
            {
                Id = tier.Id,
                Name = tier.Name,
                CreatedAtUtc = tier.CreatedAtUtc,
                IsCurrent = true
            };
        }
        finally
        {
            _mutex.Release();
        }
    }

    private void MoveRootJsonIfExists(string fileName, string tierDir)
    {
        var src = Path.Combine(DataRoot, fileName);
        var dest = Path.Combine(tierDir, fileName);
        if (!File.Exists(src))
            return;

        File.Move(src, dest);
    }

    private string GetTierDirectory(Guid tierId) =>
        Path.Combine(DataRoot, "raid-tiers", tierId.ToString());

    private async Task<RaidTierIndexState> ReadIndexFileAsync()
    {
        if (!File.Exists(_indexPath))
            throw new InvalidOperationException("Raid tier index is missing.");

        var json = await File.ReadAllTextAsync(_indexPath);
        var state = JsonSerializer.Deserialize<RaidTierIndexState>(json, JsonFileStorage.StorageJsonOptions);
        if (state == null || state.RaidTiers.Count == 0 || state.CurrentRaidTierId == Guid.Empty)
            throw new InvalidOperationException("Raid tier index is corrupt.");

        return state;
    }

    private async Task WriteIndexFileAsync(RaidTierIndexState state)
    {
        var json = JsonSerializer.Serialize(state, JsonFileStorage.StorageJsonOptions);
        var tmp = _indexPath + ".tmp";
        await File.WriteAllTextAsync(tmp, json);
        File.Move(tmp, _indexPath, overwrite: true);
    }

    private static async Task WriteMembersFileAsync(string tierDir, DataModel data)
    {
        var path = Path.Combine(tierDir, "members.json");
        var json = JsonSerializer.Serialize(data, JsonFileStorage.StorageJsonOptions);
        var tmp = path + ".tmp";
        await File.WriteAllTextAsync(tmp, json);
        File.Move(tmp, path, overwrite: true);
    }

    private static async Task WriteWeeksFileAsync(string tierDir, WeekDataModel data)
    {
        var path = Path.Combine(tierDir, "weeks.json");
        var json = JsonSerializer.Serialize(data, JsonFileStorage.StorageJsonOptions);
        var tmp = path + ".tmp";
        await File.WriteAllTextAsync(tmp, json);
        File.Move(tmp, path, overwrite: true);
    }

    private static async Task WriteLootFileAsync(string tierDir, LootAssignmentDataModel data)
    {
        var path = Path.Combine(tierDir, "loot-assignments.json");
        var json = JsonSerializer.Serialize(data, JsonFileStorage.StorageJsonOptions);
        var tmp = path + ".tmp";
        await File.WriteAllTextAsync(tmp, json);
        File.Move(tmp, path, overwrite: true);
    }

    private static async Task WriteScheduleFileAsync(string tierDir, ScheduleFileData data)
    {
        var path = Path.Combine(tierDir, "schedule.json");
        var json = JsonSerializer.Serialize(data, JsonFileStorage.StorageJsonOptions);
        var tmp = path + ".tmp";
        await File.WriteAllTextAsync(tmp, json);
        File.Move(tmp, path, overwrite: true);
    }

    /// <summary>Copies standard raid days and availability rows onto new member ids (same roster order as clone).</summary>
    private static ScheduleFileData RemapScheduleMemberIds(
        ScheduleFileData? source,
        List<Member> sourceMembers,
        List<Member> clonedMembers)
    {
        var outData = new ScheduleFileData();
        if (source == null)
            return outData;

        outData.SchemaVersion = source.SchemaVersion >= 1 ? source.SchemaVersion : 1;
        outData.StandardRaidDaysOfWeek = source.StandardRaidDaysOfWeek?.ToList() ?? new List<DayOfWeek>();
        if (source.Responses == null || sourceMembers.Count != clonedMembers.Count)
            return outData;

        var map = new Dictionary<Guid, Guid>();
        for (var i = 0; i < sourceMembers.Count; i++)
            map[sourceMembers[i].Id] = clonedMembers[i].Id;

        foreach (var r in source.Responses)
        {
            if (!map.TryGetValue(r.MemberId, out var newId))
                continue;
            outData.Responses.Add(new ScheduleResponseEntry
            {
                MemberId = newId,
                Date = r.Date,
                Status = r.Status,
                Comment = r.Comment,
                IsManuallyEdited = r.IsManuallyEdited
            });
        }

        if (source.WeekComments != null)
        {
            foreach (var wc in source.WeekComments)
            {
                if (!map.TryGetValue(wc.MemberId, out var newId))
                    continue;
                outData.WeekComments.Add(new ScheduleWeekCommentEntry
                {
                    MemberId = newId,
                    WeekStartMonday = wc.WeekStartMonday,
                    Comment = wc.Comment
                });
            }
        }

        return outData;
    }

    /// <summary>Copies <c>data/images/{oldFile}</c> to <c>data/images/{newMemberId}{ext}</c> when the source file exists.</summary>
    private string? CopyProfileImageFileIfExists(string? profileImageUrl, Guid newMemberId)
    {
        if (string.IsNullOrWhiteSpace(profileImageUrl))
            return null;

        var baseName = Path.GetFileName(profileImageUrl.Trim());
        if (string.IsNullOrEmpty(baseName))
            return null;

        var imagesDir = Path.Combine(DataRoot, "images");
        var srcPath = Path.Combine(imagesDir, baseName);
        if (!File.Exists(srcPath))
        {
            _logger.LogWarning("Profile image missing on disk while cloning tier; expected {Path}", srcPath);
            return null;
        }

        try
        {
            Directory.CreateDirectory(imagesDir);
            var ext = Path.GetExtension(baseName);
            var newFileName = $"{newMemberId}{ext}";
            var destPath = Path.Combine(imagesDir, newFileName);
            File.Copy(srcPath, destPath, overwrite: true);
            return $"/images/{newFileName}";
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to copy profile image for cloned member {MemberId}", newMemberId);
            return null;
        }
    }

    private static Member CloneMemberForNewTier(Member source)
    {
        return new Member
        {
            Id = Guid.NewGuid(),
            Name = source.Name,
            Role = source.Role,
            PermissionRole = source.PermissionRole,
            PinHash = source.PinHash,
            ProfileImageUrl = null,
            IsActive = source.IsActive,
            MainSpecBisJobAbbrev = source.MainSpecBisJobAbbrev,
            MainSpecBisJobCategory = source.MainSpecBisJobCategory,
            OffSpecBisJobAbbrev = source.OffSpecBisJobAbbrev,
            OffSpecBisJobCategory = source.OffSpecBisJobCategory,
            XivGearLink = source.XivGearLink,
            BisItems = CloneGearItems(source.BisItems),
            OffSpecXivGearLink = source.OffSpecXivGearLink,
            OffSpecFullCofferSet = source.OffSpecFullCofferSet,
            OffSpecBisItems = CloneGearItems(source.OffSpecBisItems),
            MainSpecLinkStates = CloneLinkStates(source.MainSpecLinkStates),
            OffSpecLinkStates = CloneLinkStates(source.OffSpecLinkStates)
        };
    }

    private static List<GearItem> CloneGearItems(IReadOnlyList<GearItem> items)
    {
        return items
            .Select(g => new GearItem
            {
                Id = g.Id,
                Slot = g.Slot,
                ItemName = g.ItemName,
                ItemType = g.ItemType,
                IsAcquired = g.IsAcquired,
                UpgradeMaterialAcquired = g.UpgradeMaterialAcquired
            })
            .ToList();
    }

    private static Dictionary<string, Dictionary<GearSlot, (bool IsAcquired, bool UpgradeMaterialAcquired)>> CloneLinkStates(
        Dictionary<string, Dictionary<GearSlot, (bool IsAcquired, bool UpgradeMaterialAcquired)>> source)
    {
        var copy = new Dictionary<string, Dictionary<GearSlot, (bool, bool)>>();
        foreach (var (link, slotMap) in source)
            copy[link] = new Dictionary<GearSlot, (bool, bool)>(slotMap);
        return copy;
    }
}
