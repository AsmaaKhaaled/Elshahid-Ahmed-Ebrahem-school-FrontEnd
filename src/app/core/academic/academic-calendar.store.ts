import { Injectable, computed, inject, signal } from '@angular/core';
import { AcademicTermDto, AcademicYearService } from '../services/academic-year.service';

export interface AcademicTerm {
  id: string;
  year: string;
  term: 1 | 2;
  label: string;
  // Real dates (YYYY-MM-DD) recorded when the term became current / was ended
  startedAt?: string;
  endedAt?: string;
  // Expected start / end dates from the ministry's school calendar, known before the year starts.
  // The admin can still move them (the ministry sometimes changes them) until the term is over.
  plannedStartDate?: string;
  plannedEndDate?: string;
}

export interface TermEndReminder {
  kind: 'soon' | 'overdue';
  // Days until the planned end date (0 = today, negative = days overdue)
  daysLeft: number;
}

const STORAGE_KEY_CALENDAR = 'school_academic_calendar_v1';

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

export function startYearOf(term: AcademicTerm): number {
  return Number(term.id.slice(0, 4));
}

// Term 1 -> term 2 of the same year; term 2 -> term 1 of the next academic year
export function termAfter(term: AcademicTerm): AcademicTerm {
  return term.term === 1 ? makeTerm(startYearOf(term), 2) : makeTerm(startYearOf(term) + 1, 1);
}

const DEFAULT_TERMS: AcademicTerm[] = [
  {
    ...makeTerm(2025, 2),
    startedAt: '2026-02-07',
    endedAt: '2026-09-19',
    plannedStartDate: '2026-02-07',
    plannedEndDate: '2026-06-11'
  },
  { ...makeTerm(2026, 1), startedAt: '2026-09-19', plannedStartDate: '2026-09-19', plannedEndDate: '2027-01-21' },
  { ...makeTerm(2026, 2), plannedStartDate: '2027-02-06', plannedEndDate: '2027-06-10' }
];

export function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Whole days from one YYYY-MM-DD date to another
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86400000);
}

const DEFAULT_CURRENT_ID = makeTerm(2026, 1).id;

function loadStoredCalendar(): { terms: AcademicTerm[]; currentTermId: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CALENDAR);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.terms) && parsed.terms.length > 0 && parsed.currentTermId) {
        return parsed;
      }
    }
  } catch {}
  return { terms: DEFAULT_TERMS, currentTermId: DEFAULT_CURRENT_ID };
}

function saveCalendarLocally(terms: AcademicTerm[], currentTermId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_CALENDAR, JSON.stringify({ terms, currentTermId }));
  } catch {}
}

/**
 * The academic years / terms of the school and which one is current.
 * Backed live by PostgreSQL via AcademicYearService (/api/v1/academic-year)
 * and persisted in LocalStorage for instant zero-latency startup.
 */
@Injectable({ providedIn: 'root' })
export class AcademicCalendarStore {
  private readonly api = inject(AcademicYearService);

  private readonly initial = loadStoredCalendar();
  readonly terms = signal<AcademicTerm[]>(this.initial.terms);
  readonly currentTermId = signal<string>(this.initial.currentTermId);
  readonly isSaving = signal<boolean>(false);

  readonly currentTerm = computed(() =>
    this.terms().find(term => term.id === this.currentTermId()) ?? this.terms().at(-1)!
  );
  readonly currentYear = computed(() => this.currentTerm().year);

  // The term that would come after the latest one in the list
  readonly nextTermToAdd = computed(() => termAfter(this.terms().at(-1)!));
  // The term right after the current one (may or may not exist yet)
  readonly termAfterCurrent = computed(() => termAfter(this.currentTerm()));

  // Reminder for the admin as the current term's planned end date approaches or passes.
  readonly endReminder = computed<TermEndReminder | null>(() => {
    const plannedEnd = this.currentTerm().plannedEndDate;
    if (!plannedEnd) return null;
    const daysLeft = daysBetween(today(), plannedEnd);
    if (daysLeft < 0) return { kind: 'overdue', daysLeft };
    return daysLeft <= TERM_END_REMINDER_DAYS ? { kind: 'soon', daysLeft } : null;
  });

  constructor() {
    this.syncFromBackend();
  }

  syncFromBackend(): void {
    this.api.getAllTerms().subscribe({
      next: res => {
        if (res?.terms && res.terms.length > 0) {
          const mapped: AcademicTerm[] = res.terms.map(t => ({
            id: t.id,
            year: t.year,
            term: t.term,
            label: t.label,
            startedAt: t.startedAt || undefined,
            endedAt: t.endedAt || undefined,
            plannedStartDate: t.plannedStartDate || undefined,
            plannedEndDate: t.plannedEndDate || undefined
          }));
          this.terms.set(mapped);
          if (res.currentTermId) {
            this.currentTermId.set(res.currentTermId);
          }
          saveCalendarLocally(mapped, res.currentTermId || this.currentTermId());
        }
      },
      error: err => {
        console.warn('[AcademicCalendarStore] Could not load calendar from server, using local fallback.', err);
      }
    });
  }

  termStatus(term: AcademicTerm): 'current' | 'past' | 'upcoming' {
    if (term.id === this.currentTermId()) return 'current';
    return term.id < this.currentTermId() ? 'past' : 'upcoming';
  }

  // Ended terms keep their history; only current/upcoming terms can be re-planned
  setPlannedEndDate(termId: string, date: string): void {
    // 1. Instant optimistic update
    this.terms.update(list =>
      list.map(t => (t.id === termId && this.termStatus(t) !== 'past' ? { ...t, plannedEndDate: date || undefined } : t))
    );
    saveCalendarLocally(this.terms(), this.currentTermId());

    // 2. Persist to API
    this.api.updatePlannedDates(termId, { plannedEndDate: date || undefined }).subscribe({
      error: err => console.error('[AcademicCalendarStore] Failed to update planned end date on server', err)
    });
  }

  // Only a term that hasn't started yet can have its start moved; once it starts, the real date counts
  setPlannedStartDate(termId: string, date: string): void {
    // 1. Instant optimistic update
    this.terms.update(list =>
      list.map(t => (t.id === termId && this.termStatus(t) === 'upcoming' ? { ...t, plannedStartDate: date || undefined } : t))
    );
    saveCalendarLocally(this.terms(), this.currentTermId());

    // 2. Persist to API
    this.api.updatePlannedDates(termId, { plannedStartDate: date || undefined }).subscribe({
      error: err => console.error('[AcademicCalendarStore] Failed to update planned start date on server', err)
    });
  }

  /** The earliest a term may start: after the term before it ends (actually, or as planned). */
  earliestStart(term: AcademicTerm): string {
    const index = this.terms().findIndex(t => t.id === term.id);
    const previous = index > 0 ? this.terms()[index - 1] : null;
    return previous?.endedAt ?? previous?.plannedEndDate ?? '';
  }

  /** The latest a term may end: before the term after it is planned to start. */
  latestEnd(term: AcademicTerm): string {
    const index = this.terms().findIndex(t => t.id === term.id);
    return this.terms()[index + 1]?.plannedStartDate ?? '';
  }

  addNextTerm(): AcademicTerm {
    const term = this.nextTermToAdd();
    // 1. Instant optimistic update
    this.terms.update(list => [...list, term]);
    saveCalendarLocally(this.terms(), this.currentTermId());

    // 2. Persist to API
    this.api.addNextTerm({
      plannedStartDate: term.plannedStartDate,
      plannedEndDate: term.plannedEndDate
    }).subscribe({
      next: serverTerm => {
        if (serverTerm) {
          this.terms.update(list =>
            list.map(t => t.id === serverTerm.id ? {
              ...t,
              startedAt: serverTerm.startedAt || undefined,
              endedAt: serverTerm.endedAt || undefined,
              plannedStartDate: serverTerm.plannedStartDate || undefined,
              plannedEndDate: serverTerm.plannedEndDate || undefined
            } : t)
          );
          saveCalendarLocally(this.terms(), this.currentTermId());
        }
      },
      error: err => console.error('[AcademicCalendarStore] Failed to add next term on server', err)
    });

    return term;
  }

  /**
   * Ends the current term today and starts the one right after it today.
   * Synced with Backend API.
   */
  startNextTerm(): void {
    const ended = this.currentTerm();
    const next = this.termAfterCurrent();
    const date = today();

    // 1. Instant optimistic update
    this.terms.update(list => {
      const withNext = list.some(t => t.id === next.id) ? list : [...list, next].sort((a, b) => a.id.localeCompare(b.id));
      return withNext.map(t => {
        if (t.id === ended.id) return { ...t, endedAt: date };
        if (t.id === next.id) return { ...t, startedAt: date };
        return t;
      });
    });
    this.currentTermId.set(next.id);
    saveCalendarLocally(this.terms(), next.id);

    // 2. Persist to API
    this.isSaving.set(true);
    this.api.transitionToNextTerm().subscribe({
      next: res => {
        this.isSaving.set(false);
        if (res?.currentTerm) {
          this.currentTermId.set(res.currentTerm.id);
        }
        if (res?.terms && res.terms.length > 0) {
          const mapped: AcademicTerm[] = res.terms.map(t => ({
            id: t.id,
            year: t.year,
            term: t.term,
            label: t.label,
            startedAt: t.startedAt || undefined,
            endedAt: t.endedAt || undefined,
            plannedStartDate: t.plannedStartDate || undefined,
            plannedEndDate: t.plannedEndDate || undefined
          }));
          this.terms.set(mapped);
          saveCalendarLocally(mapped, this.currentTermId());
        }
      },
      error: err => {
        this.isSaving.set(false);
        console.error('[AcademicCalendarStore] Failed to transition to next term on server', err);
      }
    });
  }

  // Only the last upcoming term can be removed, so the sequence stays continuous
  canRemove(term: AcademicTerm): boolean {
    return this.termStatus(term) === 'upcoming' && term.id === this.terms().at(-1)?.id;
  }

  removeTerm(termId: string): void {
    const term = this.terms().find(t => t.id === termId);
    if (term && this.canRemove(term)) {
      // 1. Instant optimistic update
      this.terms.update(list => list.filter(t => t.id !== termId));
      saveCalendarLocally(this.terms(), this.currentTermId());

      // 2. Persist to API
      this.api.deleteUpcomingTerm(termId).subscribe({
        error: err => console.error('[AcademicCalendarStore] Failed to remove term on server', err)
      });
    }
  }
}
