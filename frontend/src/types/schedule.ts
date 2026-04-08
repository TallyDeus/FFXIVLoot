export type ScheduleAvailability = 'yes' | 'no' | 'maybe';

export const ScheduleConsensus = {
  Raiding: 'raiding',
  MaybeRaiding: 'maybeRaiding',
  NotRaiding: 'notRaiding',
  Incomplete: 'incomplete',
} as const;

export type ScheduleConsensusType = (typeof ScheduleConsensus)[keyof typeof ScheduleConsensus];

export interface ScheduleCell {
  status: ScheduleAvailability | null;
  comment?: string;
  /** True when a stored override exists (explicit edit, maybe, or per-day comment); not set for pure defaults. */
  isManuallyEdited?: boolean;
}

export interface ScheduleDayHeader {
  date: string;
  dayName: string;
  dayOfWeek: number;
  isStandardRaidDay: boolean;
  /** At least one member has a manual override on this calendar day. */
  hasManualOverride?: boolean;
  consensus: ScheduleConsensusType;
}

export interface ScheduleWeekBlock {
  weekStartMonday: string;
  days: ScheduleDayHeader[];
}

export interface ScheduleMemberRow {
  id: string;
  name: string;
  profileImageUrl?: string | null;
  cellsByDate: Record<string, ScheduleCell>;
  /** Week start Monday (yyyy-MM-dd) → note for that whole week. */
  weekCommentsByWeekStart?: Record<string, string | null | undefined>;
}

export interface ScheduleView {
  viewStartMonday: string;
  standardRaidDaysOfWeek: number[];
  weeks: ScheduleWeekBlock[];
  members: ScheduleMemberRow[];
}

/** .NET DayOfWeek: Sunday = 0 … Saturday = 6 */
export const WEEKDAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
