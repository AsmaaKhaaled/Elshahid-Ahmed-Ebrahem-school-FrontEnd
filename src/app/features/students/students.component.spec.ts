import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideTestDefaults } from '../../../testing/test-helpers';
import { environment } from '../../../environments/environment';
import { StudentsComponent } from './students.component';

const API = `${environment.apiUrl}/api/v1/students`;

const apiStudent = (id: string, enrollmentStatus: string) => ({
  id,
  studentCode: `STD-2026-${id}`,
  fullNameArabic: `طالب ${id}`,
  nationalId: `3100101123456${id}`,
  gradeLevel: 'الصف الأول الإعدادي',
  class: { name: '1/1' },
  guardianName: 'ولي الأمر',
  guardianPhone: '01000000000',
  enrollmentStatus
});

describe('StudentsComponent', () => {
  let component: StudentsComponent;
  let fixture: ComponentFixture<StudentsComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentsComponent],
      providers: provideTestDefaults()
    }).compileComponents();

    fixture = TestBed.createComponent(StudentsComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  const loadStudents = () => {
    http.expectOne(API).flush({
      data: [apiStudent('1', 'منتظم'), apiStudent('2', 'منتظم'), apiStudent('3', 'موقوف'), apiStudent('4', 'منقول')]
    });
    fixture.detectChanges();
  };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('counts regular, stopped and transferred students separately by enrollment status', () => {
    loadStudents();
    expect(component.metrics()).toEqual(
      jasmine.objectContaining({ total: 4, regular: 2, stopped: 1, transferred: 1, inactive: 2 })
    );

    const cards = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(cards).toContain('موقوف');
    expect(cards).toContain('منقول لمدرسة أخرى');
  });

  it('shows "—" for high achievers while no grades exist, instead of 0', () => {
    loadStudents();
    expect(component.metrics().honor).toBeNull();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('—');
    expect(text).toContain('لا توجد درجات بعد');
  });

  it('shows a failed delete as an error, not a success message', () => {
    loadStudents();
    component.deleteStudent('1');
    http.expectOne(`${API}/1`).flush({ message: 'الطالب غير موجود' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(component.notice()).toEqual({ message: 'الطالب غير موجود', kind: 'error' });
    const alert = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('الطالب غير موجود');
    expect(alert?.textContent).not.toContain('✓');
    expect(component.students().length).toBe(4);
  });

  describe('pagination', () => {
    const SIZE_KEY = 'sch_page_size:admin-students';
    const loadMany = (count: number) => {
      http.expectOne(API).flush({
        data: Array.from({ length: count }, (_, i) => apiStudent(String(i + 1), i % 2 ? 'موقوف' : 'منتظم'))
      });
      fixture.detectChanges();
    };

    beforeEach(() => localStorage.removeItem(SIZE_KEY));
    afterEach(() => localStorage.removeItem(SIZE_KEY));

    it('shows 15 students per page out of the full list', () => {
      loadMany(40);
      expect(component.pagedStudents().length).toBe(15);
      expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(15);
      expect(fixture.nativeElement.textContent).toContain('عرض 1–15 من 40');

      component.page.set(3);
      expect(component.pagedStudents().map(s => s.id)).toEqual(Array.from({ length: 10 }, (_, i) => String(i + 31)));
    });

    it('goes back to page 1 when a filter changes, and pages the filtered list', () => {
      loadMany(40);
      component.page.set(2);
      component.selectedStatus.set('موقوف');
      expect(component.currentPage()).toBe(1);
      expect(component.filteredStudents().length).toBe(20);
      expect(component.pagedStudents().length).toBe(15);
    });

    it('remembers the chosen size and starts from page 1', () => {
      loadMany(40);
      component.page.set(2);
      component.changePageSize(50);
      expect(component.currentPage()).toBe(1);
      expect(component.pagedStudents().length).toBe(40);
      expect(localStorage.getItem(SIZE_KEY)).toBe('50');
    });

    it('stays on the last page that still exists after a delete', () => {
      loadMany(16);
      component.page.set(2);
      component.deleteStudent('16');
      http.expectOne(`${API}/16`).flush({ data: null });
      expect(component.currentPage()).toBe(1);
      expect(component.pagedStudents().length).toBe(15);
    });
  });

  it('shows a successful delete as success and removes the student', () => {
    loadStudents();
    component.deleteStudent('1');
    http.expectOne(`${API}/1`).flush({ data: null });
    fixture.detectChanges();

    expect(component.notice()?.kind).toBe('success');
    expect(component.students().map(s => s.id)).not.toContain('1');
    expect(component.metrics().regular).toBe(1);
  });
});
