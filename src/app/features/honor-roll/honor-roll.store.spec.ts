import { TestBed } from '@angular/core/testing';
import { HonorEntry } from './honor-roll.model';
import { HonorRollStore } from './honor-roll.store';

describe('HonorRollStore', () => {
  let store: HonorRollStore;

  const student: HonorEntry = {
    id: 'hon-test',
    kind: 'STUDENT',
    name: 'كريم سامح',
    photoUrl: '',
    subject: '',
    section: '1/4',
    achievement: 'بطل المدرسة في الشطرنج'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(HonorRollStore);
  });

  it('splits the entries into teachers and students', () => {
    expect(store.teachers().every(e => e.kind === 'TEACHER')).toBeTrue();
    expect(store.students().every(e => e.kind === 'STUDENT')).toBeTrue();
    expect(store.teachers().length + store.students().length).toBe(store.entries().length);
  });

  it('adds, updates and removes an entry', () => {
    store.saveEntry(student);
    expect(store.students()).toContain(student);

    store.saveEntry({ ...student, section: '2/4' });
    expect(store.students().find(e => e.id === student.id)?.section).toBe('2/4');

    store.deleteEntry(student.id);
    expect(store.entries().some(e => e.id === student.id)).toBeFalse();
  });
});
