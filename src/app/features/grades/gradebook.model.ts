// ---- سجل رصد درجات الصف: the weekly marks a teacher records for a class in a subject ----
// Same for every subject: each week a weekly assessment (20), the homework notebook (10) and
// attendance & behaviour (10), out of 40; four weeks make a month, which ends with its average.

export type CriterionKey = 'weekly' | 'homework' | 'behavior';

export const GRADE_CRITERIA: { key: CriterionKey; label: string; short: string; max: number }[] = [
  { key: 'weekly', label: 'تقييم أسبوعي', short: 'تقييم', max: 20 },
  { key: 'homework', label: 'كراس الواجب', short: 'الواجب', max: 10 },
  { key: 'behavior', label: 'المواظبة والسلوك', short: 'المواظبة', max: 10 }
];

export const WEEK_TOTAL = GRADE_CRITERIA.reduce((sum, c) => sum + c.max, 0);
export const WEEKS_PER_MONTH = 4;

/** One student's marks in one week; a missing mark = not recorded yet */
export type WeekMarks = Partial<Record<CriterionKey, number>>;

/** week (its Saturday, YYYY-MM-DD) -> studentId -> marks */
export type BookWeeks = Record<string, Record<string, WeekMarks>>;

export interface GradeMonth {
  index: number;
  label: string;
  // Saturdays, YYYY-MM-DD
  weeks: string[];
}

const ORDINALS = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع'];

export function bookKey(termId: string, section: string, subject: string): string {
  return `${termId}|${section}|${subject}`;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The Saturday a school week starts on, on or before the date. */
export function weekStart(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 1) % 7));
  return isoDate(d);
}

/** The term's months so far, four weeks each from the week the term started in. */
export function termMonths(termStart: string, until: string): GradeMonth[] {
  const months: GradeMonth[] = [];
  const cursor = new Date(`${weekStart(termStart)}T00:00:00`);
  const last = weekStart(until);
  while (isoDate(cursor) <= last && months.length < ORDINALS.length) {
    const weeks: string[] = [];
    for (let w = 0; w < WEEKS_PER_MONTH; w++) {
      weeks.push(isoDate(cursor));
      cursor.setDate(cursor.getDate() + 7);
    }
    months.push({ index: months.length, label: `الشهر ${ORDINALS[months.length]}`, weeks });
  }
  return months;
}

/** "2026/09/12" as on the paper register */
export function weekLabel(week: string): string {
  return week.replace(/-/g, '/');
}

export function hasMarks(marks: WeekMarks | undefined): boolean {
  return !!marks && GRADE_CRITERIA.some(c => marks[c.key] != null);
}

/** A week's total out of 40, or null when nothing was recorded that week. */
export function weekTotal(marks: WeekMarks | undefined): number | null {
  if (!hasMarks(marks)) return null;
  return GRADE_CRITERIA.reduce((sum, c) => sum + (marks![c.key] ?? 0), 0);
}

export function isValidMark(key: CriterionKey, value: number | undefined): boolean {
  const max = GRADE_CRITERIA.find(c => c.key === key)!.max;
  return value == null || (Number.isFinite(value) && value >= 0 && value <= max);
}

export interface MonthAverage {
  weekly: number | null;
  homework: number | null;
  behavior: number | null;
  total: number | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** The month's average (متوسط الشهر): each criterion and the total, over the weeks that have marks. */
export function monthAverage(weeks: (WeekMarks | undefined)[]): MonthAverage {
  const recorded = weeks.filter(hasMarks) as WeekMarks[];
  const avg = (pick: (m: WeekMarks) => number) =>
    recorded.length ? round1(recorded.reduce((sum, m) => sum + pick(m), 0) / recorded.length) : null;
  return {
    weekly: avg(m => m.weekly ?? 0),
    homework: avg(m => m.homework ?? 0),
    behavior: avg(m => m.behavior ?? 0),
    total: avg(m => weekTotal(m) ?? 0)
  };
}
