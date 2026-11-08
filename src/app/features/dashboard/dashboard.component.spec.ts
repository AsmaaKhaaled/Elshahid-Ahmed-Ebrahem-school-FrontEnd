import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { loginAs, provideTestDefaults } from '../../../testing/test-helpers';
import { makeTeacher } from '../../../testing/teacher-fixtures';
import { AcademicCalendarStore } from '../../core/academic/academic-calendar.store';
import { StudentsStore } from '../students/students.store';
import { slotKey } from '../teachers/teacher.model';
import { TeachersStore } from '../teachers/teachers.store';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  async function open(role: 'SUPER_ADMIN' | 'TEACHER'): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: provideTestDefaults()
    }).compileComponents();
    loginAs(role);
    const teachers = TestBed.inject(TeachersStore);
    teachers.teachers.set([
      makeTeacher('1', 'محمود عبد العزيز الشناوي'),
      makeTeacher('2', 'نادية كمال الشربيني', { status: 'إجازة اعتيادية' }),
      makeTeacher('3', 'شريف فؤاد عبد الهادي', { specialization: 'العلوم', subjects: ['العلوم'] })
    ]);
    const termId = TestBed.inject(AcademicCalendarStore).currentTermId();
    teachers.saveSchedule('2', termId, { [slotKey(1, 0)]: { subject: 'اللغة الإنجليزية', section: '2/1' } });
    teachers.saveSchedule('3', termId, {
      [slotKey(2, 0)]: { subject: 'العلوم', section: '1/1' },
      [slotKey(2, 1)]: { subject: 'العلوم', section: '1/2' }
    });
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => localStorage.removeItem('sch_user_profile'));

  function stat(title: string) {
    return component.adminStats().find(s => s.title === title)!;
  }

  it('shows the admin real numbers from the system data', async () => {
    await open('SUPER_ADMIN');
    const students = TestBed.inject(StudentsStore);

    expect(stat('الطلاب المقيدين').value).toBe(students.students().length);
    expect(stat('هيئة التدريس').value).toBe(TestBed.inject(TeachersStore).teachers().length);

    students.saveStudent({ ...students.students()[0], id: 'new', nationalId: '31009091234567' });
    expect(stat('الطلاب المقيدين').value).toBe(students.students().length);
  });

  it('charts each teacher’s weekly load and the periods per subject', async () => {
    await open('SUPER_ADMIN');
    const teachers = TestBed.inject(TeachersStore);
    const termId = TestBed.inject(AcademicCalendarStore).currentTermId();
    teachers.saveSchedule('1', termId, {
      [slotKey(0, 0)]: { subject: 'الرياضيات', section: '3/1' },
      [slotKey(0, 1)]: { subject: 'الرياضيات', section: '3/2' }
    });

    expect(component.teacherLoad().find(t => t.label === 'أ. محمود عبد العزيز الشناوي')!.value).toBe(2);
    const loads = component.teacherLoad().map(t => t.value);
    expect(loads).toEqual([...loads].sort((a, b) => b - a));

    const totalPeriods = Object.values(teachers.schedules()[termId]).reduce((sum, s) => sum + Object.keys(s).length, 0);
    expect(component.subjectPeriods().reduce((sum, s) => sum + s.value, 0)).toBe(totalPeriods);
  });

  it('lists what needs follow-up, such as a class without an advisor', async () => {
    await open('SUPER_ADMIN');
    // Class 3/4 has no advisor for the current year in the demo data
    expect(component.followUps().some(f => f.text.includes('3/4') && f.link === '/classes')).toBeTrue();
    expect(stat('الفصول الدراسية').tone).toBe('warn');

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('النصاب الأسبوعي للمعلمين');
    expect(text).toContain('تحتاج متابعة');
  });

  it('keeps the teacher dashboard without the admin charts', async () => {
    await open('TEACHER');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('موادي وفصولها');
    expect(text).not.toContain('النصاب الأسبوعي للمعلمين');
  });

  it("shows a teacher of two subjects each subject's own classes", async () => {
    await open('TEACHER');
    // The signed-in teacher: Arabic to 1/1 & 2/1, religion to 1/1 only
    TestBed.inject(TeachersStore).teachers.update(list => [
      ...list,
      makeTeacher('test-TEACHER', 'أحمد علي', {
        subjects: ['اللغة العربية', 'التربية الدينية'],
        classes: ['1/1', '2/1'],
        assignments: [
          { subject: 'اللغة العربية', classes: ['1/1', '2/1'] },
          { subject: 'التربية الدينية', classes: ['1/1'] }
        ]
      })
    ]);
    TestBed.inject(HttpTestingController)
      .expectOne(req => req.url.endsWith('/teachers/me/classes'))
      .flush({ data: { classes: [{ id: 'x', name: '1/1', displayNameArabic: '', gradeLevel: '', roomNumber: '101', capacity: 40, studentCount: 33, isAdvisor: false }] } });
    fixture.detectChanges();

    expect(component.teachingGroups().map(g => [g.subject, g.classes.map(c => c.name)])).toEqual([
      ['اللغة العربية', ['1/1', '2/1']],
      ['التربية الدينية', ['1/1']]
    ]);
    // 1/1 takes both subjects but is one class
    expect(component.taughtClassCount()).toBe(2);
    expect(component.teachingGroups()[0].classes[0]).toEqual({ name: '1/1', gradeLabel: 'الصف الأول الإعدادي', roomNumber: '101', studentCount: 33 });
    expect(component.teacherSubjectsLabel()).toBe('اللغة العربية والتربية الدينية');
  });
});
