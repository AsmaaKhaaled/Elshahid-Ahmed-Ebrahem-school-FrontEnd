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
  function clearPageSizes(): void {
    localStorage.removeItem('sch_page_size:student-attendance-sheet');
    localStorage.removeItem('sch_page_size:student-attendance-archive');
  }

  afterEach(() => clearPageSizes());

  beforeEach(async () => {
    clearPageSizes();
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

  it('pages the sheet 15 students at a time and changes only the visible slice', () => {
    loginAs('TEACHER');
    const { component } = create();
    const total = component.draft().length;
    expect(component.sheetPageSize()).toBe(15);
    expect(component.sheetRows().length).toBe(Math.min(15, total));

    component.sheetPage.set(2);
    component.changeSheetPageSize(20);
    expect(component.sheetPage()).toBe(1);
    expect(component.sheetRows().length).toBe(Math.min(20, total));
    expect(component.draft().length).toBe(total);
    expect(localStorage.getItem('sch_page_size:student-attendance-sheet')).toBe('20');
    // The archive keeps its own size
    expect(component.archivePageSize()).toBe(15);
  });

  it('saves students that are not on the visible page', () => {
    loginAs('TEACHER');
    const { component } = create();
    const store = TestBed.inject(ClassAttendanceStore);
    if (openSchoolDay() !== today()) return;

    const last = component.draft().at(-1)!;
    component.setStatus(last.studentId, 'LATE');
    component.changeSheetPageSize(15);
    component.sheetPage.set(1);
    component.save();
    expect(store.sheet(component.selectedSection(), today())!.marks[last.studentId].status).toBe('LATE');
  });

  it('pages the archive with its own remembered size, from page 1', () => {
    localStorage.setItem('sch_page_size:student-attendance-archive', '50');
    loginAs('TEACHER');
    const { component } = create();
    expect(component.archivePageSize()).toBe(50);
    expect(component.sheetPageSize()).toBe(15);

    component.archivePage.set(2);
    component.changeArchivePageSize(100);
    expect(component.archivePage()).toBe(1);
    expect(component.archiveRows().length).toBe(Math.min(100, component.archiveRecords().length));
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
