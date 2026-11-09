import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { loginAs, provideTestDefaults } from '../../../testing/test-helpers';
import { today } from '../../core/academic/academic-calendar.store';
import { AttendanceDay, DayRecord } from './teacher-attendance.model';
import { TeacherAttendanceComponent } from './teacher-attendance.component';

const API = 'http://localhost:5000/api/v1/teacher-attendance';

function teacher(i: number, status: DayRecord['status'] = null): DayRecord {
  return { teacherId: `t${i}`, teacherName: `معلم ${i}`, specialization: 'الرياضيات', status, arrivalTime: '', departureTime: '', note: '' };
}

function dayOf(records: DayRecord[], change: Partial<AttendanceDay> = {}): AttendanceDay {
  return {
    date: today(), today: today(), dayType: 'SCHOOL_DAY', holiday: null, isFuture: false,
    closed: null, editable: true, records, ...change
  };
}

function meta(page: number, total: number, limit = 15) {
  return { page, limit, pageSize: limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

describe('TeacherAttendanceComponent', () => {
  let fixture: ComponentFixture<TeacherAttendanceComponent>;
  let component: TeacherAttendanceComponent;
  let http: HttpTestingController;

  async function open(day: AttendanceDay): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [TeacherAttendanceComponent],
      providers: provideTestDefaults()
    }).compileComponents();
    loginAs('SUPER_ADMIN');
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TeacherAttendanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    http.expectOne(`${API}/day/${today()}`).flush({ data: { day } });
    archiveRequest().flush({ data: { records: [], summary: {} }, meta: meta(1, 0) });
    http.expectOne(`${API}/holidays`).flush({ data: { holidays: [] } });
    fixture.detectChanges();
  }

  function archiveRequest(): TestRequest {
    return http.expectOne(req => req.url === `${API}/records`);
  }

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  beforeEach(() => clearPageSizes());

  afterEach(() => {
    http.verify();
    localStorage.removeItem('sch_user_profile');
    clearPageSizes();
  });

  function clearPageSizes(): void {
    localStorage.removeItem('sch_page_size:teacher-attendance-sheet');
    localStorage.removeItem('sch_page_size:teacher-attendance-archive');
  }

  it('shows the day sheet 15 teachers per page', async () => {
    await open(dayOf(Array.from({ length: 17 }, (_, i) => teacher(i + 1))));

    expect(component.sheetRows().length).toBe(15);
    expect(text()).toContain('عرض 1–15 من 17');

    component.sheetPage.set(2);
    fixture.detectChanges();
    expect(component.sheetRows().map(r => r.teacherId)).toEqual(['t16', 't17']);
  });

  it('changes only the visible slice of the sheet and still saves teachers on other pages', async () => {
    await open(dayOf(Array.from({ length: 30 }, (_, i) => teacher(i + 1))));
    component.setStatus('t25', 'ABSENT');
    component.sheetPage.set(2);

    component.changeSheetPageSize(20);
    fixture.detectChanges();
    expect(component.sheetPage()).toBe(1);
    expect(component.sheetRows().length).toBe(20);
    expect(component.draft().length).toBe(30);
    expect(component.dirty()).toBeTrue();
    expect(localStorage.getItem('sch_page_size:teacher-attendance-sheet')).toBe('20');
    // The archive keeps its own size
    expect(component.archivePageSize()).toBe(15);

    component.save();
    const req = http.expectOne(`${API}/day/${today()}`);
    expect(req.request.body.records.map((r: { teacherId: string }) => r.teacherId)).toEqual(['t25']);
    req.flush({ data: { day: dayOf(Array.from({ length: 30 }, (_, i) => teacher(i + 1, i === 24 ? 'ABSENT' : null))) } });
  });

  it('remembers the sheet size and ignores a size that is no longer offered', async () => {
    localStorage.setItem('sch_page_size:teacher-attendance-sheet', '50');
    localStorage.setItem('sch_page_size:teacher-attendance-archive', '33');
    await open(dayOf([teacher(1)]));
    expect(component.sheetPageSize()).toBe(50);
    expect(component.archivePageSize()).toBe(15);
  });

  it('saves only the teachers that were marked, with times only for those who came in', async () => {
    await open(dayOf([teacher(1), teacher(2), teacher(3)]));

    component.setStatus('t1', 'PRESENT');
    component.setStatus('t2', 'ABSENT');
    expect(component.dirty()).toBeTrue();
    component.save();

    const req = http.expectOne(`${API}/day/${today()}`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.records).toEqual([
      { teacherId: 't1', status: 'PRESENT', arrivalTime: '07:30', departureTime: '14:00', note: '' },
      { teacherId: 't2', status: 'ABSENT', arrivalTime: '', departureTime: '', note: '' }
    ]);

    // Locked while saving: a second click sends nothing
    component.save();
    http.expectNone(`${API}/day/${today()}`);

    const saved = dayOf([{ ...teacher(1, 'PRESENT'), arrivalTime: '07:30', departureTime: '14:00' }, teacher(2, 'ABSENT'), teacher(3)]);
    req.flush({ data: { day: saved } });
    expect(component.dirty()).toBeFalse();
    expect(component.notice()).toBe('تم حفظ دفتر اليوم.');
  });

  it('marks only the unmarked teachers present and keeps a recorded absence', async () => {
    await open(dayOf([teacher(1, 'ABSENT'), teacher(2)]));
    component.markUnmarkedPresent();
    expect(component.draft().map(r => r.status)).toEqual(['ABSENT', 'PRESENT']);
  });

  it('saves pending changes before approving the day, then refreshes the archive', async () => {
    await open(dayOf([teacher(1), teacher(2)]));
    component.setStatus('t1', 'LATE');
    component.closeDay();

    http.expectOne(r => r.method === 'PUT').flush({ data: { day: dayOf([teacher(1, 'LATE'), teacher(2)]) } });
    const close = http.expectOne(`${API}/day/${today()}/close`);
    const closedDay = dayOf([teacher(1, 'LATE'), teacher(2, 'NOT_RECORDED')], {
      editable: false, closed: { closedAt: new Date().toISOString(), closedBy: 'المدير', autoClosed: false }
    });
    close.flush({ data: { day: closedDay } });
    archiveRequest().flush({ data: { records: [], summary: {} }, meta: meta(1, 0) });
    fixture.detectChanges();

    expect(component.editable()).toBeFalse();
    expect(text()).toContain('تم اعتماد هذا الدفتر');
    expect(text()).toContain('لم يُسجل');
  });

  it('shows a holiday instead of the sheet', async () => {
    await open(dayOf([teacher(1)], {
      dayType: 'HOLIDAY', editable: false,
      holiday: { id: 'h1', startDate: today(), endDate: today(), reason: 'عيد الأضحى' }
    }));
    expect(text()).toContain('إجازة رسمية: عيد الأضحى');
    expect(fixture.nativeElement.querySelector('[aria-label="دفتر اليوم"]')).toBeNull();
  });

  it('filters and pages the archive on the server', async () => {
    await open(dayOf([teacher(1)]));

    component.setFilter('status', 'ABSENT');
    let req = archiveRequest();
    expect(req.request.params.get('status')).toBe('ABSENT');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('15');
    expect(req.request.params.has('pageSize')).toBeFalse();
    expect(req.request.params.has('from')).toBeFalse();
    req.flush({
      data: { records: [{ ...teacher(1, 'ABSENT'), id: 'r1', date: '2026-10-29' }], summary: { ABSENT: 40 } },
      meta: meta(1, 40)
    });
    fixture.detectChanges();
    expect(text()).toContain('عرض 1–15 من 40');

    component.goToArchivePage(3);
    req = archiveRequest();
    expect(req.request.params.get('page')).toBe('3');
    expect(req.request.params.get('status')).toBe('ABSENT');
    req.flush({ data: { records: [], summary: {} }, meta: meta(3, 40) });
  });

  it('asks the server for the new archive size from page 1, keeping the filters', async () => {
    await open(dayOf([teacher(1)]));
    component.setFilter('status', 'LATE');
    archiveRequest().flush({ data: { records: [], summary: {} }, meta: meta(1, 40) });
    component.goToArchivePage(2);
    archiveRequest().flush({ data: { records: [], summary: {} }, meta: meta(2, 40) });

    component.changeArchivePageSize(50);
    const req = archiveRequest();
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('50');
    expect(req.request.params.get('status')).toBe('LATE');
    expect(localStorage.getItem('sch_page_size:teacher-attendance-archive')).toBe('50');
    expect(component.sheetPageSize()).toBe(15);
    req.flush({ data: { records: [], summary: {} }, meta: meta(1, 40, 50) });
  });

  it('registers a holiday and closes the dialog once saved', async () => {
    await open(dayOf([teacher(1)]));
    component.openHolidayDialog();
    component.saveHoliday({ startDate: '2026-11-05', endDate: '2026-11-05', reason: 'انتخابات' });

    const req = http.expectOne(`${API}/holidays`);
    expect(req.request.method).toBe('POST');
    req.flush({ data: { holiday: { id: 'h1', startDate: '2026-11-05', endDate: '2026-11-05', reason: 'انتخابات' } } });

    expect(component.holidayDialogOpen()).toBeFalse();
    http.expectOne(`${API}/holidays`).flush({ data: { holidays: [] } });
    http.expectOne(`${API}/day/${today()}`).flush({ data: { day: dayOf([teacher(1)]) } });
  });

  it('keeps the holiday dialog open with the server message on a conflict', async () => {
    await open(dayOf([teacher(1)]));
    component.openHolidayDialog();
    component.saveHoliday({ startDate: '2026-10-29', endDate: '2026-10-29', reason: 'اختبار' });

    http.expectOne(`${API}/holidays`).flush(
      { message: 'يوم 2026-10-29 تم تسجيل حضور المعلمين فيه بالفعل، لا يمكن تسجيله إجازة' },
      { status: 409, statusText: 'Conflict' }
    );
    expect(component.holidayDialogOpen()).toBeTrue();
    expect(component.holidayError()).toContain('تم تسجيل حضور');
  });
});
