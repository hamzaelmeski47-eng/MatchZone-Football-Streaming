/**
 * Official Moroccan / Greenwich Time utilities (توقيت المغرب - GMT+0).
 *
 * All match kickoff times, dates, and schedule cards are calibrated strictly
 * to Morocco Time (GMT+0 / غرينيتش).
 */

const ARABIC_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

/**
 * Returns offset in milliseconds for Morocco GMT+0 relative to UTC:
 * Strict 0 ms (GMT+0 / غرينيتش).
 */
export function getMoroccoUtcOffsetMs(_d?: Date): number {
  return 0;
}

/**
 * Returns a new Date object representing the moment in Moroccan local clock (GMT+0).
 */
export function getMoroccoLocalDate(value?: string | number | Date | null): Date {
  if (!value) return new Date();
  const raw = typeof value === 'number' ? new Date(value < 1e11 ? value * 1000 : value) : new Date(value);
  if (isNaN(raw.getTime())) return new Date();
  return raw;
}

/**
 * Returns the Moroccan date in YYYY-MM-DD format (GMT+0).
 */
export function getMoroccoDateOnly(value?: string | number | Date | null): string {
  const m = getMoroccoLocalDate(value);
  const y = m.getUTCFullYear();
  const month = String(m.getUTCMonth() + 1).padStart(2, '0');
  const day = String(m.getUTCDate()).padStart(2, '0');
  return `${y}-${month}-${day}`;
}

/**
 * Format match kickoff time strictly in Moroccan Time GMT+0 (24h format HH:MM).
 * e.g. "20:00", "00:00", "15:30"
 */
export function formatMoroccoTime(
  value: string | number | Date | null | undefined,
  status?: 'live' | 'upcoming' | 'finished' | string
): string {
  if (status === 'live') return 'مباشر';
  if (status === 'finished') return 'انتهت';
  if (!value) return '--:--';

  const m = getMoroccoLocalDate(value);
  const hours = String(m.getUTCHours()).padStart(2, '0');
  const minutes = String(m.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format exact kickoff time in Moroccan Time GMT+0 regardless of status.
 */
export function formatMoroccoKickoffExact(value: string | number | Date | null | undefined): string {
  if (!value) return '--:--';
  const m = getMoroccoLocalDate(value);
  const hours = String(m.getUTCHours()).padStart(2, '0');
  const minutes = String(m.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Strict check whether a match kickoff time belongs to TODAY (before 00:00 midnight) in Moroccan time (GMT+0).
 * Matches at or after 00:00 belonging to the next calendar date are strictly NOT today (they belong to tomorrow/غداً).
 */
export function isMatchToday(value: string | number | Date | null | undefined): boolean {
  if (!value) return false;
  try {
    const matchDateStr = getMoroccoDateOnly(value);
    const todayDateStr = getMoroccoDateOnly(new Date());
    return matchDateStr === todayDateStr;
  } catch {
    return false;
  }
}

/**
 * Format match date in Moroccan Time GMT+0:
 * 'اليوم', 'غداً', 'أمس', or 'الأربعاء 30 سبتمبر'
 */
export function formatMoroccoMatchDate(value: string | number | Date | null | undefined): string {
  if (!value) return 'اليوم';
  try {
    const matchMoroccoDate = getMoroccoDateOnly(value);
    const todayMoroccoDate = getMoroccoDateOnly(new Date());

    // Strict string equality check: if matchMoroccoDate !== todayMoroccoDate, it is NEVER 'اليوم'
    if (matchMoroccoDate === todayMoroccoDate) return 'اليوم';

    const m = getMoroccoLocalDate(value);
    const today = getMoroccoLocalDate(new Date());

    // Check difference in days
    const matchMidnight = Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), m.getUTCDate());
    const todayMidnight = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    const diffDays = Math.round((matchMidnight - todayMidnight) / (24 * 3600 * 1000));

    if (diffDays === 1) return 'غداً';
    if (diffDays === -1) return 'أمس';

    const dayName = ARABIC_DAYS[m.getUTCDay()];
    const dayNumber = m.getUTCDate();
    const monthName = ARABIC_MONTHS[m.getUTCMonth()];
    return `${dayName} ${dayNumber} ${monthName}`;
  } catch {
    return 'اليوم';
  }
}

/**
 * 3-Day Rolling Window (أمس، اليوم، غداً) based strictly on Moroccan Time GMT+0.
 */
export function getMoroccoDaysList(): Array<{
  dateStr: string;
  dayName: string;
  dayNumber: number;
  monthName: string;
  isToday: boolean;
}> {
  const todayMorocco = getMoroccoLocalDate(new Date());
  const list: Array<{
    dateStr: string;
    dayName: string;
    dayNumber: number;
    monthName: string;
    isToday: boolean;
  }> = [];

  for (let i = -1; i <= 1; i++) {
    const d = new Date(todayMorocco);
    d.setUTCDate(todayMorocco.getUTCDate() + i);

    const y = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const dateStr = `${y}-${month}-${day}`;

    const isToday = i === 0;
    const dayName = isToday ? 'اليوم' : i === -1 ? 'أمس' : 'غداً';
    const dayNumber = d.getUTCDate();
    const monthName = ARABIC_MONTHS[d.getUTCMonth()];

    list.push({ dateStr, dayName, dayNumber, monthName, isToday });
  }

  return list;
}
