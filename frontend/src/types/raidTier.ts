import type { MemberRole } from './member';

export interface RaidTierSummary {
  id: string;
  name: string;
  createdAtUtc: string;
  isCurrent: boolean;
}

/** Member row on raid tier overview cards (from tier members.json). */
export interface RaidTierMemberPreview {
  id: string;
  name: string;
  profileImageUrl?: string;
  isActive: boolean;
  role: MemberRole;
}

export interface RaidTierOverview {
  id: string;
  name: string;
  createdAtUtc: string;
  isCurrent: boolean;
  members: RaidTierMemberPreview[];
  weekCount: number;
  activeWeekNumber: number;
  lootAssignmentCount: number;
  activeLootAssignmentCount: number;
}

/** members.json / weeks.json / loot-assignments.json still at data root */
export interface LegacyRootDataStatus {
  hasLegacyFiles: boolean;
  fileNames: string[];
}
