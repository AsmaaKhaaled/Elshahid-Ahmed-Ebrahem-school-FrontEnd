import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideTestDefaults } from '../../../testing/test-helpers';
import { HonorEntryDto } from '../../core/services/honor-roll.service';
import { HonorEntry } from './honor-roll.model';
import { HonorRollStore } from './honor-roll.store';

const API = 'http://localhost:5000/api/v1/honor-roll';

describe('HonorRollStore', () => {
  let store: HonorRollStore;
  let http: HttpTestingController;

  const student: HonorEntry = {
    id: '',
    kind: 'STUDENT',
    name: 'كريم سامح',
    photoUrl: '',
    subject: '',
    section: '1/4',
    achievement: 'بطل المدرسة في الشطرنج'
  };
  const saved = (extra: Partial<HonorEntryDto> = {}): HonorEntryDto => ({
    id: 'hr-server-1', kind: 'STUDENT', name: 'كريم سامح', photoUrl: null, subjects: [], section: '1/4',
    achievement: 'بطل المدرسة في الشطرنج', ...extra
  });

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
    store = TestBed.inject(HonorRollStore);
    http = TestBed.inject(HttpTestingController);
    // Nothing on the server yet: the store keeps its sample entries
    http.expectOne(req => req.url === API && req.method === 'GET').flush({ status: 'success', data: { teachers: [], students: [] } });
  });

  afterEach(() => http.verify());

  it('splits the entries into teachers and students', () => {
    expect(store.teachers().every(e => e.kind === 'TEACHER')).toBeTrue();
    expect(store.students().every(e => e.kind === 'STUDENT')).toBeTrue();
    expect(store.teachers().length + store.students().length).toBe(store.entries().length);
  });

  it('adds, updates and removes an entry on the server', () => {
    store.saveEntry(student);
    const create = http.expectOne(req => req.url === API && req.method === 'POST');
    expect(create.request.body.section).toBe('1/4');
    expect(create.request.body.subjects).toEqual([]);
    create.flush({ status: 'success', data: saved() });
    expect(store.students().some(e => e.id === 'hr-server-1')).toBeTrue();

    const entry = store.students().find(e => e.id === 'hr-server-1')!;
    store.saveEntry({ ...entry, section: '2/4' });
    // Shown right away, before the server answers
    expect(store.students().find(e => e.id === 'hr-server-1')?.section).toBe('2/4');
    http.expectOne(`${API}/hr-server-1`).flush({ status: 'success', data: saved({ section: '2/4' }) });
    expect(store.students().find(e => e.id === 'hr-server-1')?.section).toBe('2/4');

    store.deleteEntry('hr-server-1');
    expect(store.entries().some(e => e.id === 'hr-server-1')).toBeFalse();
    const remove = http.expectOne(`${API}/hr-server-1`);
    expect(remove.request.method).toBe('DELETE');
    remove.flush({ status: 'success', data: { id: 'hr-server-1' } });
  });

  it('puts an entry back when the server refuses to delete it', () => {
    store.saveEntry(student);
    http.expectOne(req => req.method === 'POST').flush({ status: 'success', data: saved() });

    store.deleteEntry('hr-server-1');
    http.expectOne(`${API}/hr-server-1`).flush({ message: 'خطأ' }, { status: 500, statusText: 'Server Error' });
    expect(store.entries().some(e => e.id === 'hr-server-1')).toBeTrue();
  });
});
