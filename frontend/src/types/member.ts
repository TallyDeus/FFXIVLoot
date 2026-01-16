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
  offSpecXivGearLink?: string;
  offSpecBisItems: GearItem[];
  permissionRole?: PermissionRole;
}

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

