import { TestBed } from '@angular/core/testing';
import { AcademicCalendarStore, TERM_END_REMINDER_DAYS, makeTerm, termAfter, today } from './academic-calendar.store';

function shiftedDate(days: number): string {
  const date = new Date(Date.parse(today()) + days * 86400000);
  return date.toISOString().slice(0, 10);
}

describe('AcademicCalendarStore', () => {
  let store: AcademicCalendarStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(AcademicCalendarStore);
  });

  it('starts on the first term of 2026/2027', () => {
    expect(store.currentTerm().id).toBe('2026-2027-T1');
    expect(store.currentYear()).toBe('2026/2027');
  });

  it('builds the next term in order: term 1 -> term 2 -> next year term 1', () => {
    expect(termAfter(makeTerm(2026, 1)).id).toBe('2026-2027-T2');
    expect(termAfter(makeTerm(2026, 2)).id).toBe('2027-2028-T1');
  });

  describe('startNextTerm', () => {
    it('moves forward one term and records the real end / start dates', () => {
      store.startNextTerm();

      const ended = store.terms().find(t => t.id === '2026-2027-T1')!;
      expect(store.currentTermId()).toBe('2026-2027-T2');
      expect(ended.endedAt).toBe(today());
      expect(store.currentTerm().startedAt).toBe(today());
      expect(store.termStatus(ended)).toBe('past');
    });

    it('adds the next academic year when ending a second term', () => {
      store.startNextTerm();
      store.startNextTerm();

      expect(store.currentTermId()).toBe('2027-2028-T1');
      expect(store.currentYear()).toBe('2027/2028');
    });
  });

  describe('planned end date', () => {
    it('reminds the admin when the term ends within the reminder window', () => {
      store.setPlannedEndDate(store.currentTermId(), shiftedDate(5));
      expect(store.endReminder()).toEqual({ kind: 'soon', daysLeft: 5 });
    });

    it('stays quiet while the end date is far away', () => {
      store.setPlannedEndDate(store.currentTermId(), shiftedDate(TERM_END_REMINDER_DAYS + 10));
      expect(store.endReminder()).toBeNull();
    });

    it('flags the term as overdue once the date has passed', () => {
      store.setPlannedEndDate(store.currentTermId(), shiftedDate(-3));
      expect(store.endReminder()).toEqual({ kind: 'overdue', daysLeft: -3 });
    });

    it('cannot change the planned date of a term that already ended', () => {
      const past = store.terms().find(t => store.termStatus(t) === 'past')!;
      store.setPlannedEndDate(past.id, '2030-01-01');
      expect(store.terms().find(t => t.id === past.id)!.plannedEndDate).toBe(past.plannedEndDate);
    });
  });

  describe('adding and removing terms', () => {
    it('adds the term after the latest one', () => {
      const added = store.addNextTerm();
      expect(added.id).toBe('2027-2028-T1');
      expect(store.terms().at(-1)!.id).toBe('2027-2028-T1');
    });

    it('only removes the last upcoming term', () => {
      const current = store.currentTerm();
      const last = store.terms().at(-1)!;

      expect(store.canRemove(current)).toBeFalse();
      expect(store.canRemove(last)).toBeTrue();

      store.removeTerm(current.id);
      expect(store.terms().some(t => t.id === current.id)).toBeTrue();

      store.removeTerm(last.id);
      expect(store.terms().some(t => t.id === last.id)).toBeFalse();
    });
  });
});
