using FFXIVLoot.Application.DTOs;
using FFXIVLoot.Application.Interfaces;
using FFXIVLoot.Infrastructure.Storage;

namespace FFXIVLoot.Infrastructure.Services;

/// <summary>JSON file per raid tier: data/raid-tiers/{tierId}/raid-plans.json</summary>
public sealed class RaidPlanStorageService : IRaidPlanStorage
{
    private readonly IRaidTierManagement _tiers;
    private readonly IRaidPlanExtractor _extractor;

    public RaidPlanStorageService(IRaidTierManagement tiers, IRaidPlanExtractor extractor)
    {
        _tiers = tiers;
        _extractor = extractor;
    }

    private string RaidPlansPath(Guid raidTierId) =>
        Path.Combine(_tiers.DataRoot, "raid-tiers", raidTierId.ToString(), "raid-plans.json");

    private JsonFileStorage Storage(Guid raidTierId) => new(RaidPlansPath(raidTierId));

    public async Task<RaidPlanLayoutDto> GetLayoutAsync(Guid raidTierId, CancellationToken cancellationToken = default)
    {
        var file = await LoadAsync(raidTierId, cancellationToken);
        return ToLayoutDto(file);
    }

    public async Task<RaidPlanCategoryDto> CreateCategoryAsync(Guid raidTierId, RaidPlanCategoryCreateDto dto, CancellationToken cancellationToken = default)
    {
        var name = (dto.Name ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(name))
            throw new ArgumentException("Category name is required.", nameof(dto));

        var file = await LoadAsync(raidTierId, cancellationToken);

        Guid? parentId = dto.ParentCategoryId is { } p && p != Guid.Empty ? p : null;
        if (parentId.HasValue)
        {
            var parent = file.Categories.Find(x => x.Id == parentId.Value);
            if (parent == null)
                throw new ArgumentException("Parent category not found.", nameof(dto));
            if (parent.ParentCategoryId != null)
                throw new InvalidOperationException("Subcategories cannot contain subcategories.");
        }

        var siblings = file.Categories.Where(c => c.ParentCategoryId == parentId).ToList();
        var max = siblings.Count == 0 ? -1 : siblings.Max(c => c.SortOrder);
        var entry = new RaidPlanCategoryStoredEntry
        {
            Id = Guid.NewGuid(),
            Name = name,
            SortOrder = max + 1,
            ParentCategoryId = parentId
        };
        file.Categories.Add(entry);
        await SaveAsync(raidTierId, file, cancellationToken);
        return ToCategoryDto(entry);
    }

    public async Task<RaidPlanCategoryDto?> UpdateCategoryAsync(Guid raidTierId, Guid id, RaidPlanCategoryUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var name = (dto.Name ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(name))
            throw new ArgumentException("Category name is required.", nameof(dto));

        var file = await LoadAsync(raidTierId, cancellationToken);
        var c = file.Categories.Find(x => x.Id == id);
        if (c == null)
            return null;
        c.Name = name;
        await SaveAsync(raidTierId, file, cancellationToken);
        return ToCategoryDto(c);
    }

    public async Task<bool> DeleteCategoryAsync(Guid raidTierId, Guid id, CancellationToken cancellationToken = default)
    {
        var file = await LoadAsync(raidTierId, cancellationToken);
        var c = file.Categories.Find(x => x.Id == id);
        if (c == null)
            return false;

        if (c.ParentCategoryId is { } parentCatId)
        {
            var parent = file.Categories.Find(x => x.Id == parentCatId);
            if (parent == null)
                return false;

            file.Plans.RemoveAll(p => p.CategoryId == id);
            file.Categories.Remove(c);
            await SaveAsync(raidTierId, file, cancellationToken);
            return true;
        }

        var children = file.Categories.Where(x => x.ParentCategoryId == id).ToList();
        var otherTopLevel = file.Categories.Where(x => x.Id != id && x.ParentCategoryId == null).OrderBy(x => x.SortOrder).ToList();
        if (otherTopLevel.Count == 0)
            throw new InvalidOperationException("Cannot delete the last top-level category.");

        var subtree = new HashSet<Guid> { id };
        foreach (var ch in children)
            subtree.Add(ch.Id);

        file.Plans.RemoveAll(p => subtree.Contains(p.CategoryId));
        file.Categories.RemoveAll(x => subtree.Contains(x.Id));
        await SaveAsync(raidTierId, file, cancellationToken);
        return true;
    }

    public async Task<RaidPlanDto> CreateAsync(Guid raidTierId, RaidPlanCreateDto dto, CancellationToken cancellationToken = default)
    {
        var title = (dto.Title ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(title))
            throw new ArgumentException("Title is required.", nameof(dto));

        var url = RaidPlanUrl.NormalizeAndValidate(dto.RaidplanUrl ?? string.Empty);

        var file = await LoadAsync(raidTierId, cancellationToken);
        var categoryId = dto.CategoryId ?? file.Categories.OrderBy(c => c.SortOrder).FirstOrDefault()?.Id;
        if (categoryId == null || categoryId == Guid.Empty)
            throw new InvalidOperationException("Create a category first.");

        if (file.Categories.All(c => c.Id != categoryId))
            throw new ArgumentException("Invalid category.", nameof(dto));

        var extracted = await _extractor.ExtractAsync(url, cancellationToken);
        var now = DateTime.UtcNow;
        var maxOrder = file.Plans.Where(p => p.CategoryId == categoryId).Select(p => p.SortOrder).DefaultIfEmpty(-1).Max();

        var entry = new RaidPlanStoredEntry
        {
            Id = Guid.NewGuid(),
            CategoryId = categoryId.Value,
            Title = title.Trim(),
            RaidplanUrl = url,
            CreatedAtUtc = now,
            SortOrder = maxOrder + 1,
            Slides = extracted.Slides.Select(ToStoredSlide).ToList(),
            GlobalNotesRaw = extracted.GlobalNotesRaw,
            LastExtractedAtUtc = now
        };

        file.Plans.Add(entry);
        await SaveAsync(raidTierId, file, cancellationToken);
        return ToPlanDto(entry);
    }

    public async Task<RaidPlanDto?> UpdateAsync(Guid raidTierId, Guid id, RaidPlanUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var title = (dto.Title ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(title))
            throw new ArgumentException("Title is required.", nameof(dto));

        var url = RaidPlanUrl.NormalizeAndValidate(dto.RaidplanUrl ?? string.Empty);

        var file = await LoadAsync(raidTierId, cancellationToken);
        var entry = file.Plans.Find(p => p.Id == id);
        if (entry == null)
            return null;

        if (dto.CategoryId.HasValue && dto.CategoryId.Value != Guid.Empty)
        {
            if (file.Categories.All(c => c.Id != dto.CategoryId.Value))
                throw new ArgumentException("Invalid category.", nameof(dto));
            entry.CategoryId = dto.CategoryId.Value;
        }

        entry.Title = title;
        var urlChanged = !string.Equals(entry.RaidplanUrl, url, StringComparison.OrdinalIgnoreCase);
        entry.RaidplanUrl = url;

        if (urlChanged)
        {
            var extracted = await _extractor.ExtractAsync(url, cancellationToken);
            entry.Slides = extracted.Slides.Select(ToStoredSlide).ToList();
            entry.GlobalNotesRaw = extracted.GlobalNotesRaw;
            entry.LastExtractedAtUtc = DateTime.UtcNow;
        }

        await SaveAsync(raidTierId, file, cancellationToken);
        return ToPlanDto(entry);
    }

    public async Task<bool> DeleteAsync(Guid raidTierId, Guid id, CancellationToken cancellationToken = default)
    {
        var file = await LoadAsync(raidTierId, cancellationToken);
        var n = file.Plans.RemoveAll(p => p.Id == id);
        if (n == 0)
            return false;
        await SaveAsync(raidTierId, file, cancellationToken);
        return true;
    }

    public async Task<RaidPlanDto?> RefreshAsync(Guid raidTierId, Guid id, CancellationToken cancellationToken = default)
    {
        var file = await LoadAsync(raidTierId, cancellationToken);
        var entry = file.Plans.Find(p => p.Id == id);
        if (entry == null)
            return null;

        var extracted = await _extractor.ExtractAsync(entry.RaidplanUrl, cancellationToken);
        entry.Slides = extracted.Slides.Select(ToStoredSlide).ToList();
        entry.GlobalNotesRaw = extracted.GlobalNotesRaw;
        entry.LastExtractedAtUtc = DateTime.UtcNow;
        await SaveAsync(raidTierId, file, cancellationToken);
        return ToPlanDto(entry);
    }

    public async Task ApplyReorderAsync(Guid raidTierId, RaidPlanReorderDto dto, CancellationToken cancellationToken = default)
    {
        var file = await LoadAsync(raidTierId, cancellationToken);

        if (dto.Categories != null)
        {
            foreach (var o in dto.Categories)
            {
                var c = file.Categories.Find(x => x.Id == o.Id);
                if (c != null)
                    c.SortOrder = o.SortOrder;
            }
        }

        if (dto.Plans != null)
        {
            foreach (var o in dto.Plans)
            {
                var p = file.Plans.Find(x => x.Id == o.Id);
                if (p == null)
                    continue;
                if (file.Categories.All(c => c.Id != o.CategoryId))
                    continue;
                p.CategoryId = o.CategoryId;
                p.SortOrder = o.SortOrder;
            }
        }

        await SaveAsync(raidTierId, file, cancellationToken);
    }

    private async Task<RaidPlansFileData> LoadAsync(Guid raidTierId, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var path = RaidPlansPath(raidTierId);
        if (!File.Exists(path))
            await TryMigrateLegacyFromRootAsync(raidTierId, path, cancellationToken);

        var storage = Storage(raidTierId);
        var data = await storage.ReadAsync<RaidPlansFileData>();
        if (data == null)
            data = new RaidPlansFileData();
        Migrate(data);
        return data;
    }

    /// <summary>One-time: copy legacy data/raid-plans.json into the current raid tier folder.</summary>
    private async Task TryMigrateLegacyFromRootAsync(Guid raidTierId, string tierPath, CancellationToken cancellationToken)
    {
        var legacy = Path.Combine(_tiers.DataRoot, "raid-plans.json");
        if (!File.Exists(legacy))
            return;

        var current = await _tiers.GetCurrentTierIdAsync(cancellationToken);
        if (raidTierId != current)
            return;

        var dir = Path.GetDirectoryName(tierPath);
        if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
            Directory.CreateDirectory(dir);

        try
        {
            File.Copy(legacy, tierPath, overwrite: false);
            File.Move(legacy, legacy + ".migrated", overwrite: true);
        }
        catch
        {
            // If copy failed, leave legacy; first write will create new file.
        }
    }

    private static void Migrate(RaidPlansFileData file)
    {
        file.Plans ??= new();
        file.Categories ??= new();

        if (file.SchemaVersion < 2 || file.Categories.Count == 0)
        {
            var catId = file.Categories.FirstOrDefault()?.Id ?? Guid.NewGuid();
            if (file.Categories.Count == 0)
            {
                file.Categories.Add(new RaidPlanCategoryStoredEntry
                {
                    Id = catId,
                    Name = "General",
                    SortOrder = 0
                });
            }

            var ordered = file.Plans.OrderBy(p => p.CreatedAtUtc).ToList();
            for (var i = 0; i < ordered.Count; i++)
            {
                var p = ordered[i];
                if (p.CategoryId == Guid.Empty)
                    p.CategoryId = catId;
                p.SortOrder = i;
                p.Slides ??= new();
            }

            file.SchemaVersion = 2;
        }

        if (file.SchemaVersion < 3)
        {
            file.SchemaVersion = 3;
        }
    }

    private async Task SaveAsync(Guid raidTierId, RaidPlansFileData data, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        await Storage(raidTierId).WriteAsync(data);
    }

    private static RaidPlanLayoutDto ToLayoutDto(RaidPlansFileData file)
    {
        var cats = file.Categories.OrderBy(c => c.SortOrder).Select(ToCategoryDto).ToList();
        var plans = file.Plans.OrderBy(p => p.CategoryId).ThenBy(p => p.SortOrder).Select(ToPlanDto).ToList();
        return new RaidPlanLayoutDto { Categories = cats, Plans = plans };
    }

    private static RaidPlanCategoryDto ToCategoryDto(RaidPlanCategoryStoredEntry c) => new()
    {
        Id = c.Id,
        Name = c.Name,
        SortOrder = c.SortOrder,
        ParentCategoryId = c.ParentCategoryId
    };

    private static RaidPlanDto ToPlanDto(RaidPlanStoredEntry p) => new()
    {
        Id = p.Id,
        CategoryId = p.CategoryId,
        Title = p.Title,
        RaidplanUrl = p.RaidplanUrl,
        CreatedAtUtc = p.CreatedAtUtc,
        SortOrder = p.SortOrder,
        Slides = p.Slides.Select(s => new RaidPlanSlideDto
        {
            Index = s.Index,
            BackgroundImageUrl = s.BackgroundImageUrl,
            OverlayTextNotes = s.OverlayTextNotes
        }).ToList(),
        GlobalNotesRaw = p.GlobalNotesRaw,
        LastExtractedAtUtc = p.LastExtractedAtUtc
    };

    private static RaidPlanSlideStoredEntry ToStoredSlide(RaidPlanSlideDto s) => new()
    {
        Index = s.Index,
        BackgroundImageUrl = s.BackgroundImageUrl,
        OverlayTextNotes = s.OverlayTextNotes
    };
}
