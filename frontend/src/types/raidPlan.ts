export interface RaidPlanSlide {
  index: number;
  backgroundImageUrl: string | null;
  overlayTextNotes: string;
}

export interface RaidPlan {
  id: string;
  categoryId: string;
  title: string;
  raidplanUrl: string;
  createdAtUtc: string;
  sortOrder: number;
  slides: RaidPlanSlide[];
  globalNotesRaw: string | null;
  lastExtractedAtUtc: string | null;
}

export interface RaidPlanCategory {
  id: string;
  name: string;
  sortOrder: number;
  /** Present when this row is a subcategory (e.g. phase) under a fight category. */
  parentCategoryId?: string | null;
}

export interface RaidPlanLayout {
  categories: RaidPlanCategory[];
  plans: RaidPlan[];
}

export interface RaidPlanExtracted {
  title: string;
  sourceUrl: string;
  globalNotesRaw: string | null;
  slides: RaidPlanSlide[];
}

export interface RaidPlanReorderDto {
  categories?: { id: string; sortOrder: number }[];
  plans?: { id: string; categoryId: string; sortOrder: number }[];
}
