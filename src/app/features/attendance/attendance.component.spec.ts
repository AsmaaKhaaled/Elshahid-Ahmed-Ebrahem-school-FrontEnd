import { TestBed } from '@angular/core/testing';
import { loginAs, provideTestDefaults } from '../../../testing/test-helpers';
import { today } from '../../core/academic/academic-calendar.store';
import { AttendanceComponent } from './attendance.component';
import { isWeekend } from './class-attendance.model';
import { ClassAttendanceStore, shiftIsoDate } from './class-attendance.store';

/** The latest school day that isn't approved yet in the demo data: today, or the next one */
function openSchoolDay(): string {
  let date = today();
  while (isWeekend(date)) date = shiftIsoDate(date, 1);
  return date;
}

describe('AttendanceComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttendanceComponent],
      providers: provideTestDefaults()
    }).compileComponents();
  });

  function create() {
    const fixture = TestBed.createComponent(AttendanceComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('gives the teacher a sheet for one of their own classes only', () => {
    loginAs('TEACHER');
    const { component } = create();
    expect(component.scope.sections()).toContain(component.selectedSection());

    const other = component.scope.sections()[1];
    component.changeSection(other);
    expect(component.selectedSection()).toBe(other);
    expect(component.draft().length).toBeGreaterThan(0);
  });

  it('saves, then approves a day: unmarked students are kept as "not recorded" and the day locks', () => {
    loginAs('TEACHER');
    const { component } = create();
    const store = TestBed.inject(ClassAttendanceStore);
    const date = openSchoolDay();
    // A future day can't be taken; only check the flow on today
    if (date !== today()) return;

    const [first, second] = component.draft();
    component.setStatus(first.studentId, 'ABSENT');
    component.setNote(first.studentId, 'مريض');
    expect(component.dirty()).toBeTrue();
    component.save();
    expect(component.dirty()).toBeFalse();
    expect(store.sheet(component.selectedSection(), date)!.marks[first.studentId].status).toBe('ABSENT');

    component.closeDay();
    expect(component.editable()).toBeFalse();
    const archived = store.archive(component.selectedSection(), { from: date, to: date, studentId: '', status: '' });
    expect(archived.find(r => r.studentId === second.studentId)!.status).toBe('NOT_RECORDED');
    expect(archived.find(r => r.studentId === first.studentId)!.note).toBe('مريض');
  });

  it('has approved days in the archive, filtered by status', () => {
    loginAs('TEACHER');
    const { component } = create();
    expect(component.archiveRecords().length).toBeGreaterThan(0);
    component.setFilter('status', 'ABSENT');
    expect(component.archiveRecords().every(r => r.status === 'ABSENT')).toBeTrue();
  });

  it('shows a student only their own record, with nothing to change', () => {
    loginAs('STUDENT');
    const { fixture, component } = create();
    const page: HTMLElement = fixture.nativeElement;
    expect(page.textContent).toContain('سجل حضوري وغيابي');
    expect(page.querySelectorAll('button, input, select').length).toBe(0);
    expect(component.myDays().length).toBeGreaterThan(0);
    expect(component.myDays().every(d => d.studentId === component.me()!.id)).toBeTrue();
  });
});
