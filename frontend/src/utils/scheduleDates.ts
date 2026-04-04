/** Local calendar date yyyy-MM-dd (no timezone shift for same-day UI). */
export function todayLocalIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function mondayOfWeekIso(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  const dow = d.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export function addDaysIso(isoDate: string, delta: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** First Monday of the 13-week window (2 weeks before this week's Monday). */
export function scheduleRangeStartMonday(): string {
  const thisMonday = mondayOfWeekIso(todayLocalIso());
  return mondayOfWeekIso(addDaysIso(thisMonday, -14));
}
