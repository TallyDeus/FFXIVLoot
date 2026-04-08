/**
 * Gear slot enumeration
 */
export enum GearSlot {
  Weapon = 0,
  Head = 1,
  Body = 2,
  Hand = 3,
  Legs = 4,
  Feet = 5,
  Ears = 6,
  Neck = 7,
  Wrist = 8,
  RightRing = 9,
  LeftRing = 10
}

/**
 * Item type enumeration
 */
export enum ItemType {
  Raid = 0,
  AugTome = 1
}

/**
 * Floor number enumeration
 */
export enum FloorNumber {
  Floor1 = 1,
  Floor2 = 2,
  Floor3 = 3,
  Floor4 = 4
}

/**
 * Member role enumeration
 */
export enum MemberRole {
  DPS = 0,
  Support = 1
}

/**
 * Spec type enumeration
 */
export enum SpecType {
  MainSpec = 0,
  OffSpec = 1,
  Extra = 2
}

/**
 * Permission role enumeration
 */
export enum PermissionRole {
  User = 0,
  Manager = 1,
  Administrator = 2
}

/**
 * Combat role category for a BiS set (main or off), from import detection or manual.
 */
export enum BisJobCategory {
  Unknown = 0,
  Tank = 1,
  Healer = 2,
  DpsMelee = 3,
  DpsPhysRanged = 4,
  DpsCaster = 5
}

export const BisJobCategoryLabels: Record<BisJobCategory, string> = {
  [BisJobCategory.Unknown]: 'Not set',
  [BisJobCategory.Tank]: 'Tank',
  [BisJobCategory.Healer]: 'Healer',
  [BisJobCategory.DpsMelee]: 'DPS (Melee)',
  [BisJobCategory.DpsPhysRanged]: 'DPS (Phys ranged)',
  [BisJobCategory.DpsCaster]: 'DPS (Caster)'
};

/** All categories for select UI (order matters). */
export const ALL_BIS_JOB_CATEGORIES: BisJobCategory[] = [
  BisJobCategory.Unknown,
  BisJobCategory.Tank,
  BisJobCategory.Healer,
  BisJobCategory.DpsMelee,
  BisJobCategory.DpsPhysRanged,
  BisJobCategory.DpsCaster
];

/** Canonical job abbreviations (display) grouped by category — matches backend detector. */
/** Abbreviations per group, A–Z within each category. */
export const BIS_JOB_ABBREV_OPTIONS: { abbrev: string; category: BisJobCategory; group: string }[] = [
  { abbrev: 'DRK', category: BisJobCategory.Tank, group: 'Tank' },
  { abbrev: 'GNB', category: BisJobCategory.Tank, group: 'Tank' },
  { abbrev: 'PLD', category: BisJobCategory.Tank, group: 'Tank' },
  { abbrev: 'WAR', category: BisJobCategory.Tank, group: 'Tank' },
  { abbrev: 'AST', category: BisJobCategory.Healer, group: 'Healer' },
  { abbrev: 'SCH', category: BisJobCategory.Healer, group: 'Healer' },
  { abbrev: 'SGE', category: BisJobCategory.Healer, group: 'Healer' },
  { abbrev: 'WHM', category: BisJobCategory.Healer, group: 'Healer' },
  { abbrev: 'DRG', category: BisJobCategory.DpsMelee, group: 'DPS (Melee)' },
  { abbrev: 'MNK', category: BisJobCategory.DpsMelee, group: 'DPS (Melee)' },
  { abbrev: 'NIN', category: BisJobCategory.DpsMelee, group: 'DPS (Melee)' },
  { abbrev: 'RPR', category: BisJobCategory.DpsMelee, group: 'DPS (Melee)' },
  { abbrev: 'SAM', category: BisJobCategory.DpsMelee, group: 'DPS (Melee)' },
  { abbrev: 'VPR', category: BisJobCategory.DpsMelee, group: 'DPS (Melee)' },
  { abbrev: 'BRD', category: BisJobCategory.DpsPhysRanged, group: 'DPS (Phys ranged)' },
  { abbrev: 'DNC', category: BisJobCategory.DpsPhysRanged, group: 'DPS (Phys ranged)' },
  { abbrev: 'MCH', category: BisJobCategory.DpsPhysRanged, group: 'DPS (Phys ranged)' },
  { abbrev: 'BLM', category: BisJobCategory.DpsCaster, group: 'DPS (Caster)' },
  { abbrev: 'PCT', category: BisJobCategory.DpsCaster, group: 'DPS (Caster)' },
  { abbrev: 'RDM', category: BisJobCategory.DpsCaster, group: 'DPS (Caster)' },
  { abbrev: 'SMN', category: BisJobCategory.DpsCaster, group: 'DPS (Caster)' },
];

export function bisJobCategoryFromAbbrev(abbrev: string | undefined | null): BisJobCategory {
  if (!abbrev) return BisJobCategory.Unknown;
  const u = abbrev.trim().toUpperCase();
  const row = BIS_JOB_ABBREV_OPTIONS.find((o) => o.abbrev === u);
  return row?.category ?? BisJobCategory.Unknown;
}

/** Tank & Healer → Support; melee / phys ranged / caster (and unknown job) → DPS. */
export function memberRoleFromBisJobCategory(category: BisJobCategory): MemberRole {
  if (category === BisJobCategory.Tank || category === BisJobCategory.Healer) {
    return MemberRole.Support;
  }
  return MemberRole.DPS;
}

/** Optgroup order for job tag dropdowns */
export const BIS_JOB_GROUP_ORDER = [
  'Tank',
  'Healer',
  'DPS (Melee)',
  'DPS (Phys ranged)',
  'DPS (Caster)',
] as const;

/**
 * Gear item data structure
 */
export interface GearItem {
  id: string;
  slot: GearSlot;
  itemName: string;
  itemType: ItemType;
  isAcquired: boolean;
  upgradeMaterialAcquired: boolean;
}

/**
 * Member data structure
 */
export interface Member {
  id: string;
  name: string;
  role: MemberRole;
  xivGearLink?: string;
  bisItems: GearItem[];
  /** Category for the job they are currently playing (set with mainSpecBisJobAbbrev on their profile). */
  mainSpecBisJobCategory?: BisJobCategory;
  /** Job abbreviation (PLD, GNB, …); set manually — shown on the BiS tracker. */
  mainSpecBisJobAbbrev?: string;
  offSpecXivGearLink?: string;
  /** When true, off-spec BiS is tracked as raid coffers + one tomestone ring (no XivGear link). */
  offSpecFullCofferSet?: boolean;
  offSpecBisItems: GearItem[];
  permissionRole?: PermissionRole;
  profileImageUrl?: string;
  /** When false, hidden from BiS tracker, schedule, loot distribution, and raid tier previews (managers can toggle). */
  isActive?: boolean;
}

/**
 * Payload from the member form `onSave`. For new members, `pendingProfileImage` is uploaded
 * after create — omit it before calling the create-member API.
 */
export type MemberSavePayload =
  | Member
  | (Omit<Member, 'id'> & { pendingProfileImage?: File });

/**
 * XivGear import request
 */
export interface XivGearImportRequest {
  memberId: string;
  xivGearLink: string;
  specType?: SpecType;
}

/**
 * Loot assignment request
 */
export interface LootAssignment {
  memberId: string;
  slot: GearSlot;
  floorNumber: FloorNumber;
  specType?: SpecType;
}

/**
 * Upgrade material assignment request
 */
export interface UpgradeMaterialAssignment {
  memberId: string;
  isArmorMaterial: boolean;
  floorNumber: FloorNumber;
  specType?: SpecType;
}

/**
 * Member need data structure
 */
export interface MemberNeed {
  memberId: string;
  neededCount: number;
  specType?: SpecType;
}

/**
 * Week data structure
 */
export interface Week {
  weekNumber: number;
  startedAt: string;
  isCurrent: boolean;
}

/**
 * Available loot data structure
 */
export interface AvailableLoot {
  slot: GearSlot | null;
  isUpgradeMaterial: boolean;
  isArmorMaterial?: boolean;
  eligibleMembers: MemberNeed[];
  isAssigned: boolean;
  assignedToMemberId?: string;
  assignmentId?: string;
}

/**
 * Gear slot display names
 */
export const GearSlotNames: Record<GearSlot, string> = {
  [GearSlot.Weapon]: 'Weapon',
  [GearSlot.Head]: 'Head',
  [GearSlot.Body]: 'Body',
  [GearSlot.Hand]: 'Hand',
  [GearSlot.Legs]: 'Legs',
  [GearSlot.Feet]: 'Feet',
  [GearSlot.Ears]: 'Earring',
  [GearSlot.Neck]: 'Neck',
  [GearSlot.Wrist]: 'Wrist',
  [GearSlot.RightRing]: 'Right Ring',
  [GearSlot.LeftRing]: 'Left Ring'
};

/**
 * Member role display names
 */
export const MemberRoleNames: Record<MemberRole, string> = {
  [MemberRole.DPS]: 'DPS',
  [MemberRole.Support]: 'Support'
};

/**
 * Loot assignment history data structure
 */
export interface LootAssignmentHistory {
  id: string;
  weekNumber: number;
  floorNumber: number;
  memberId: string;
  memberName: string;
  slot: GearSlot | null;
  isUpgradeMaterial: boolean;
  isArmorMaterial?: boolean;
  assignedAt: string;
  isUndone: boolean;
  specType?: SpecType;
  isManualEdit?: boolean;
  itemType?: ItemType;
}

/**
 * Week assignment history data structure
 */
export interface WeekAssignmentHistory {
  weekNumber: number;
  weekStartedAt: string;
  isCurrentWeek: boolean;
  assignments: LootAssignmentHistory[];
}

