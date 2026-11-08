import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { loginAs, provideTestDefaults } from '../../../testing/test-helpers';
import { makeTeacher, teacherDto } from '../../../testing/teacher-fixtures';
import { AcademicCalendarStore } from '../../core/academic/academic-calendar.store';
import { slotKey } from './teacher.model';
import { TeachersStore } from './teachers.store';

const API = 'http://localhost:5000/api/v1/teachers';

describe('TeachersStore', () => {
  let store: TeachersStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
    store = TestBed.inject(TeachersStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('sch_user_profile');
  });

  it('loads the teachers once from the backend, mapping the employment status', () => {
    loginAs('SUPER_ADMIN');
    store.ensureLoaded();
    store.ensureLoaded();

    const onLeave = makeTeacher('2', 'نادية كمال', { status: 'إجازة اعتيادية', classes: ['2/1'] });
    http.expectOne(API).flush({ data: { teachers: [teacherDto(makeTeacher('1', 'أحمد علي')), teacherDto(onLeave)] } });

    expect(store.teachers().map(t => t.name)).toEqual(['أحمد علي', 'نادية كمال']);
    expect(store.teachers()[1]).toEqual(jasmine.objectContaining({ status: 'إجازة اعتيادية', classes: ['2/1'] }));
  });

  it('does not ask for the staff list as a student', () => {
    loginAs('STUDENT');
    store.ensureLoaded();
    http.expectNone(API);
  });

  it('creates a teacher with the initial password and keeps the list A→Z', () => {
    store.teachers.set([makeTeacher('1', 'ياسر عادل')]);
    const draft = makeTeacher('', 'إبراهيم سالم', { classes: ['3/2', '3/3'], status: 'منتدب' });

    let created = '';
    store.createTeacher(draft, 'Start2026').subscribe(t => (created = t.id));
    const req = http.expectOne(API);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(jasmine.objectContaining({
      fullName: 'إبراهيم سالم', classes: ['3/2', '3/3'], status: 'SECONDED', password: 'Start2026'
    }));
    req.flush({ data: { teacher: teacherDto({ ...draft, id: 'new' }) } });

    expect(created).toBe('new');
    expect(store.teachers().map(t => t.name)).toEqual(['إبراهيم سالم', 'ياسر عادل']);
  });

  it('sends no password on edit unless a new one was typed', () => {
    const teacher = makeTeacher('1', 'أحمد علي');
    store.teachers.set([teacher]);
    store.updateTeacher({ ...teacher, classes: ['1/1'] }, '').subscribe();

    const req = http.expectOne(`${API}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.password).toBeUndefined();
    req.flush({ data: { teacher: teacherDto({ ...teacher, classes: ['1/1'] }) } });
    expect(store.teachers()[0].classes).toEqual(['1/1']);
  });

  it('removes a deleted teacher together with all of their schedules', () => {
    store.teachers.set([makeTeacher('1', 'أحمد علي')]);
    store.saveSchedule('1', '2026-2027-T1', { [slotKey(0, 0)]: { subject: 'الرياضيات', section: '3/1' } });

    store.deleteTeacher('1').subscribe();
    http.expectOne(`${API}/1`).flush({ status: 'success' });

    expect(store.teachers()).toEqual([]);
    expect(store.schedules()['2026-2027-T1']['1']).toBeUndefined();
  });

  it('stops a teacher who left: kept in the list as stopped, without classes or schedules', () => {
    const teacher = makeTeacher('1', 'أحمد علي', { classes: ['3/1'] });
    store.teachers.set([teacher]);
    store.saveSchedule('1', '2026-2027-T1', { [slotKey(0, 0)]: { subject: 'الرياضيات', section: '3/1' } });

    let removed = -1;
    store.deactivateTeacher('1').subscribe(res => (removed = res.removedPeriods));
    const req = http.expectOne(`${API}/1/deactivate`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ data: { teacher: teacherDto({ ...teacher, active: false, classes: [], subjects: [], assignments: [] }), removedPeriods: 1 } });

    expect(removed).toBe(1);
    expect(store.teachers()[0]).toEqual(jasmine.objectContaining({ id: '1', active: false, classes: [] }));
    expect(store.schedules()['2026-2027-T1']['1']).toBeUndefined();
  });

  it('brings a stopped teacher back', () => {
    const stopped = makeTeacher('1', 'أحمد علي', { active: false });
    store.teachers.set([stopped]);

    store.activateTeacher('1').subscribe();
    const req = http.expectOne(`${API}/1/activate`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ data: { teacher: teacherDto({ ...stopped, active: true }) } });

    expect(store.teachers()[0].active).toBeTrue();
  });

  it('computes the weekly load from the current term schedule', () => {
    const termId = TestBed.inject(AcademicCalendarStore).currentTermId();
    store.saveSchedule('1', termId, {
      [slotKey(0, 0)]: { subject: 'الرياضيات', section: '3/1' },
      [slotKey(1, 0)]: { subject: 'الرياضيات', section: '3/2' }
    });
    expect(store.currentTermLoad()['1']).toEqual({ periods: 2, sections: 2 });

    TestBed.inject(AcademicCalendarStore).startNextTerm();
    expect(store.currentTermLoad()['1']).toBeUndefined();
  });
});
