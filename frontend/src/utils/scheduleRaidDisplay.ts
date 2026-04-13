import { ScheduleConsensus, type ScheduleDayHeader, type ScheduleView } from '../types/schedule';

/** Wall-clock zone for raid start (DST handled by the IANA zone). */
export const RAID_WALL_CLOCK_TIMEZONE = 'Europe/Oslo';

/**
 * UTC instant when it is 19:30 on `isoDate` (yyyy-MM-dd) in {@link RAID_WALL_CLOCK_TIMEZONE}.
 */
export function raidInstantForScheduleDate(isoDate: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return new Date(NaN);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);

  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: RAID_WALL_CLOCK_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const lo = Date.UTC(y, mo - 1, d - 1, 0, 0, 0);
  const hi = Date.UTC(y, mo - 1, d + 2, 0, 0, 0);

  for (let t = lo; t < hi; t += 60_000) {
    const parts = fmt.formatToParts(new Date(t));
    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value;
    const py = Number(get('year'));
    const pm = Number(get('month'));
    const pd = Number(get('day'));
    const ph = get('hour');
    const pmin = get('minute');
    if (py === y && pm === mo && pd === d && ph === '19' && pmin === '30') {
      return new Date(t);
    }
  }

  return new Date(Date.UTC(y, mo - 1, d, 17, 30, 0));
}

/** Next consensus raiding day strictly after `nowMs`, formatted dd/mm HH:mm in the user's local timezone. */
export function formatNextRaidLabel(view: ScheduleView, nowMs: number = Date.now()): string | null {
  const days: ScheduleDayHeader[] = view.weeks.flatMap((w) => w.days);
  days.sort((a, b) => a.date.localeCompare(b.date));
  for (const d of days) {
    if (d.consensus !== ScheduleConsensus.Raiding) continue;
    const t = raidInstantForScheduleDate(d.date).getTime();
    if (t > nowMs) {
      const dt = new Date(t);
      const dd = String(dt.getDate()).padStart(2, '0');
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const hh = String(dt.getHours()).padStart(2, '0');
      const mi = String(dt.getMinutes()).padStart(2, '0');
      return `${dd}/${mm} ${hh}:${mi}`;
    }
  }
  return null;
}
