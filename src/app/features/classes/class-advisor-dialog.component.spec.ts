import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTestDefaults } from '../../../testing/test-helpers';
import { Teacher } from '../teachers/teacher.model';
import { ClassAdvisorDialogComponent } from './class-advisor-dialog.component';
import { SchoolClass } from './school-class.model';

function teacher(id: string, status: Teacher['status'] = 'على رأس العمل'): Teacher {
  return {
    id, name: `معلم ${id}`, nationalId: '', title: '', specialization: 'الرياضيات',
    email: '', phone: '', subjects: ['الرياضيات'], status
  };
}

const schoolClass: SchoolClass = {
  id: 'c1',
  section: '1/1',
  gradeLevel: 'الصف الأول الإعدادي',
  enrolledStudents: 40,
  shift: 'صباحي',
  advisorHistory: [{ teacherId: 'current', year: '2026/2027', since: '2026-09-19', reason: 'بداية عام دراسي جديد' }]
};

describe('ClassAdvisorDialogComponent', () => {
  let component: ClassAdvisorDialogComponent;
  let fixture: ComponentFixture<ClassAdvisorDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClassAdvisorDialogComponent],
      providers: provideTestDefaults()
    }).compileComponents();

    fixture = TestBed.createComponent(ClassAdvisorDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('schoolClass', schoolClass);
    fixture.componentRef.setInput('teachers', [
      teacher('current'),
      teacher('busy'),
      teacher('on-leave', 'إجازة اعتيادية'),
      teacher('free')
    ]);
    fixture.componentRef.setInput('advisorsElsewhere', { busy: '2/1' });
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('only lets a free, on-duty teacher become the new advisor', () => {
    const blocked = Object.fromEntries(component.teacherOptions().map(o => [o.teacher.id, o.blockedReason]));

    expect(blocked['current']).toBe('الرائد الحالي');
    expect(blocked['busy']).toBe('رائد فصل 2/1');
    expect(blocked['on-leave']).toBe('إجازة اعتيادية');
    expect(blocked['free']).toBe('');
  });

  it('shows the advisor history newest first', () => {
    expect(component.history()[0].teacherId).toBe('current');
  });
});
