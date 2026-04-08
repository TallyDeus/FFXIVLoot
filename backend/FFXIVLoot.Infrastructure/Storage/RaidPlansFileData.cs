namespace FFXIVLoot.Infrastructure.Storage;

internal sealed class RaidPlansFileData
{
    /// <summary>1 = flat plans; 2 = categories + sort order + cached slides.</summary>
    public int SchemaVersion { get; set; } = 1;

    public List<RaidPlanCategoryStoredEntry> Categories { get; set; } = new();

    public List<RaidPlanStoredEntry> Plans { get; set; } = new();
}

internal sealed class RaidPlanCategoryStoredEntry
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public int SortOrder { get; set; }

    /// <summary>When set, this category is a sub-group (e.g. phase) under the parent fight category.</summary>
    public Guid? ParentCategoryId { get; set; }
}

internal sealed class RaidPlanStoredEntry
{
    public Guid Id { get; set; }

    public Guid CategoryId { get; set; }

    public string Title { get; set; } = string.Empty;

    public string RaidplanUrl { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; }

    public int SortOrder { get; set; }

    public List<RaidPlanSlideStoredEntry> Slides { get; set; } = new();

    public string? GlobalNotesRaw { get; set; }

    public DateTime? LastExtractedAtUtc { get; set; }
}

internal sealed class RaidPlanSlideStoredEntry
{
    public int Index { get; set; }

    public string? BackgroundImageUrl { get; set; }

    public string OverlayTextNotes { get; set; } = string.Empty;
}
