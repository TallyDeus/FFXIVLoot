namespace FFXIVLoot.Application.DTOs;

public sealed class RaidPlanSlideDto
{
    public int Index { get; set; }

    /// <summary>Forward-filled arena background image for this slide (same URL may repeat across slides).</summary>
    public string? BackgroundImageUrl { get; set; }

    /// <summary>Text from RaidPlan &quot;itext&quot; nodes on this slide (mechanic callouts).</summary>
    public string OverlayTextNotes { get; set; } = string.Empty;
}

/// <summary>Result of fetching and parsing a RaidPlan.io page.</summary>
public sealed class RaidPlanExtractedDto
{
    public string Title { get; set; } = string.Empty;

    public string SourceUrl { get; set; } = string.Empty;

    public string? GlobalNotesRaw { get; set; }

    public List<RaidPlanSlideDto> Slides { get; set; } = new();
}

public sealed class RaidPlanCategoryDto
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public int SortOrder { get; set; }

    /// <summary>Parent fight category when this row is a subcategory (e.g. phase); null for top-level groups.</summary>
    public Guid? ParentCategoryId { get; set; }
}

public sealed class RaidPlanDto
{
    public Guid Id { get; set; }

    public Guid CategoryId { get; set; }

    public string Title { get; set; } = string.Empty;

    public string RaidplanUrl { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; }

    public int SortOrder { get; set; }

    public List<RaidPlanSlideDto> Slides { get; set; } = new();

    /// <summary>RaidPlan.io plan-wide notes (markdown-ish text).</summary>
    public string? GlobalNotesRaw { get; set; }

    public DateTime? LastExtractedAtUtc { get; set; }
}

public sealed class RaidPlanLayoutDto
{
    public List<RaidPlanCategoryDto> Categories { get; set; } = new();

    public List<RaidPlanDto> Plans { get; set; } = new();
}

public sealed class RaidPlanCategoryCreateDto
{
    public string Name { get; set; } = string.Empty;

    /// <summary>Optional parent category (must be a top-level category; only one nesting level).</summary>
    public Guid? ParentCategoryId { get; set; }
}

public sealed class RaidPlanCategoryUpdateDto
{
    public string Name { get; set; } = string.Empty;
}

public sealed class RaidPlanCreateDto
{
    public string Title { get; set; } = string.Empty;

    public string RaidplanUrl { get; set; } = string.Empty;

    public Guid? CategoryId { get; set; }
}

public sealed class RaidPlanUpdateDto
{
    public string Title { get; set; } = string.Empty;

    public string RaidplanUrl { get; set; } = string.Empty;

    public Guid? CategoryId { get; set; }
}

public sealed class RaidPlanReorderDto
{
    public List<RaidPlanCategoryOrderDto>? Categories { get; set; }

    public List<RaidPlanPlanOrderDto>? Plans { get; set; }
}

public sealed class RaidPlanCategoryOrderDto
{
    public Guid Id { get; set; }

    public int SortOrder { get; set; }
}

public sealed class RaidPlanPlanOrderDto
{
    public Guid Id { get; set; }

    public Guid CategoryId { get; set; }

    public int SortOrder { get; set; }
}
