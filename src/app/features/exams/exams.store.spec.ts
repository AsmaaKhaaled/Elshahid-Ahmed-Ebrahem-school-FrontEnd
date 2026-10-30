import { TestBed } from '@angular/core/testing';
import { ExamsStore, addMinutes, formatTime, minutesOf } from './exams.store';

describe('exam time helpers', () => {
  it('converts times to minutes and back', () => {
    expect(minutesOf('09:30')).toBe(570);
    expect(addMinutes('09:30', 90)).toBe('11:00');
  });

  it('formats times in 12-hour Arabic style', () => {
    expect(formatTime('09:05')).toBe('9:05 ص');
    expect(formatTime('13:30')).toBe('1:30 م');
    expect(formatTime('00:15')).toBe('12:15 ص');
  });
});

describe('ExamsStore', () => {
  let store: ExamsStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(ExamsStore);
  });

  it('adds, edits and deletes subjects inside a timetable', () => {
    const scheduleId = store.schedules()[0].id;
    const before = store.schedules()[0].entries.length;
    const entry = { id: 'new', subject: 'التربية الفنية', date: '2026-11-10', startTime: '09:00', durationMinutes: 45, totalMarks: 10, notes: '' };

    store.saveEntry(scheduleId, entry);
    store.saveEntry(scheduleId, { ...entry, totalMarks: 15 });
    const saved = store.schedules()[0].entries.find(e => e.id === 'new');
    expect(store.schedules()[0].entries.length).toBe(before + 1);
    expect(saved?.totalMarks).toBe(15);

    store.deleteEntry(scheduleId, 'new');
    expect(store.schedules()[0].entries.length).toBe(before);
  });

  it('publishes and deletes a timetable', () => {
    const id = store.schedules()[1].id;
    store.setPublished(id, true);
    expect(store.schedules().find(s => s.id === id)?.published).toBeTrue();

    store.deleteSchedule(id);
    expect(store.schedules().some(s => s.id === id)).toBeFalse();
  });
});
