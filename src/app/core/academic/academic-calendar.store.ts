import { Injectable, computed, signal } from '@angular/core';

export interface AcademicTerm {
  id: string;
  year: string;
  term: 1 | 2;
  label: string;
  // Real dates (YYYY-MM-DD) recorded when the term became current / was ended
  startedAt?: string;
  endedAt?: string;
  // Expected end date from the ministry's school calendar (editable by the admin)
  plannedEndDate?: string;
}

export interface TermEndReminder {
  kind: 'soon' | 'overdue';
  // Days until the planned end date (0 = today, negative = days overdue)
  daysLeft: number;
}

const LEGACY_STORAGE_KEY = 'school.academic-calendar';

// Start reminding the admin this many days before the planned end date
export const TERM_END_REMINDER_DAYS = 14;

export function makeTerm(startYear: number, term: 1 | 2): AcademicTerm {
  const year = `${startYear}/${startYear + 1}`;
  return {
    id: `${startYear}-${startYear + 1}-T${term}`,
    year,
    term,
    label: `الفصل الدراسي ${term === 1 ? 'الأول' : 'الثاني'} ${year}`
  };
}

function startYearOf(term: AcademicTerm): number {
  return Number(term.id.slice(0, 4));
}

// Term 1 -> term 2 of the same year; term 2 -> term 1 of the next academic year
export function termAfter(term: AcademicTerm): AcademicTerm {
  return term.term === 1 ? makeTerm(startYearOf(term), 2) : makeTerm(startYearOf(term) + 1, 1);
}

const DEFAULT_TERMS: AcademicTerm[] = [
  { ...makeTerm(2025, 2), startedAt: '2026-02-07', endedAt: '2026-09-19', plannedEndDate: '2026-06-11' },
  { ...makeTerm(2026, 1), startedAt: '2026-09-19', plannedEndDate: '2027-01-21' },
  { ...makeTerm(2026, 2), plannedEndDate: '2027-06-10' }
];

export function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Whole days from one YYYY-MM-DD date to another
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86400000);
}
const DEFAULT_CURRENT_ID = makeTerm(2026, 1).id;

/**
 * The academic years / terms of the school and which one is current.
 * Managed by the admin from "العام والفصل الدراسي"; every page reads the current term from here,
 * so starting a new term or year is reflected across the whole system.
 * Demo data only: changes reset on reload until the backend API loads / saves the calendar.
 */
@Injectable({ providedIn: 'root' })
export class AcademicCalendarStore {
  // Chronological order (ids sort naturally: "2026-2027-T1" < "2026-2027-T2")
  readonly terms = signal<AcademicTerm[]>(DEFAULT_TERMS);
  readonly currentTermId = signal<string>(DEFAULT_CURRENT_ID);

  readonly currentTerm = computed(() =>
    this.terms().find(term => term.id === this.currentTermId()) ?? this.terms().at(-1)!
  );
  readonly currentYear = computed(() => this.currentTerm().year);

  // The term that would come after the latest one in the list
  readonly nextTermToAdd = computed(() => termAfter(this.terms().at(-1)!));
  // The term right after the current one (may or may not exist yet)
  readonly termAfterCurrent = computed(() => termAfter(this.currentTerm()));

  // Reminder for the admin as the current term's planned end date approaches or passes.
  // The term is never ended automatically - the admin confirms it.
  readonly endReminder = computed<TermEndReminder | null>(() => {
    const plannedEnd = this.currentTerm().plannedEndDate;
    if (!plannedEnd) return null;
    const daysLeft = daysBetween(today(), plannedEnd);
    if (daysLeft < 0) return { kind: 'overdue', daysLeft };
    return daysLeft <= TERM_END_REMINDER_DAYS ? { kind: 'soon', daysLeft } : null;
  });

  constructor() {
    // An earlier version kept the calendar in the browser; drop that leftover so demo data is used
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // Storage unavailable - nothing to clean up
    }
  }

  termStatus(term: AcademicTerm): 'current' | 'past' | 'upcoming' {
    if (term.id === this.currentTermId()) return 'current';
    return term.id < this.currentTermId() ? 'past' : 'upcoming';
  }

  // Ended terms keep their history; only current/upcoming terms can be re-planned
  setPlannedEndDate(termId: string, date: string): void {
    this.terms.update(list =>
      list.map(t => (t.id === termId && this.termStatus(t) !== 'past' ? { ...t, plannedEndDate: date || undefined } : t))
    );
  }

  addNextTerm(): AcademicTerm {
    const term = this.nextTermToAdd();
    this.terms.update(list => [...list, term]);
    return term;
  }

  /**
   * Ends the current term today and starts the one right after it today.
   * Time only moves forward: past terms can never become current again,
   * and terms can't be skipped.
   */
  startNextTerm(): void {
    const ended = this.currentTerm();
    const next = this.termAfterCurrent();
    const date = today();

    this.terms.update(list => {
      const withNext = list.some(t => t.id === next.id) ? list : [...list, next].sort((a, b) => a.id.localeCompare(b.id));
      return withNext.map(t => {
        if (t.id === ended.id) return { ...t, endedAt: date };
        if (t.id === next.id) return { ...t, startedAt: date };
        return t;
      });
    });
    this.currentTermId.set(next.id);
  }

  // Only the last upcoming term can be removed, so the sequence stays continuous
  canRemove(term: AcademicTerm): boolean {
    return this.termStatus(term) === 'upcoming' && term.id === this.terms().at(-1)?.id;
  }

  removeTerm(termId: string): void {
    const term = this.terms().find(t => t.id === termId);
    if (term && this.canRemove(term)) {
      this.terms.update(list => list.filter(t => t.id !== termId));
    }
  }
}
