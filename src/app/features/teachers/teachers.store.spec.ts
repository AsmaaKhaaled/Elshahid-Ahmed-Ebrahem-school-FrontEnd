import { TestBed } from '@angular/core/testing';
import { AcademicCalendarStore } from '../../core/academic/academic-calendar.store';
import { slotKey } from './teacher.model';
import { TeachersStore } from './teachers.store';

describe('TeachersStore', () => {
  let store: TeachersStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(TeachersStore);
  });

  it('builds conflict-free demo schedules (no section taught twice in one period)', () => {
    const termSchedules = store.schedules()['2026-2027-T1'];
    const seen = new Set<string>();
    for (const schedule of Object.values(termSchedules)) {
      for (const [key, slot] of Object.entries(schedule)) {
        const id = `${key}|${slot.section}`;
        expect(seen.has(id)).withContext(id).toBeFalse();
        seen.add(id);
      }
    }
  });

  it('computes the weekly load from the current term schedule', () => {
    store.saveSchedule('1', '2026-2027-T1', {
      [slotKey(0, 0)]: { subject: 'الرياضيات', section: '3/1' },
      [slotKey(1, 0)]: { subject: 'الرياضيات', section: '3/2' }
    });
    expect(store.currentTermLoad()['1']).toEqual({ periods: 2, sections: 2 });
  });

  it('follows the current term when the admin starts a new one', () => {
    TestBed.inject(AcademicCalendarStore).startNextTerm();
    expect(store.currentTermLoad()['1']).toBeUndefined();
  });

  it('removes a deleted teacher together with all of their schedules', () => {
    store.deleteTeacher('1');
    expect(store.teachers().some(t => t.id === '1')).toBeFalse();
    expect(store.schedules()['2026-2027-T1']['1']).toBeUndefined();
  });
});
