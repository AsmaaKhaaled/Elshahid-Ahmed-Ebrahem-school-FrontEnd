import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideTestDefaults } from '../../../testing/test-helpers';
import { StudentFormDialogComponent } from './student-form-dialog.component';
import { Student } from './student.model';
import { ClassesService } from '../../core/services/classes.service';
import { StudentsService } from '../../core/services/students.service';

const student: Student = {
  id: '1',
  code: 'STD-2026-001',
  nationalId: '31001011234567',
  name: 'أحمد ياسين محمد إبراهيم',
  gradeId: 'G1',
  className: '1/3',
  guardianName: 'ياسين محمد',
  guardianPhone: '01001234567',
  status: 'منتظم',
  gpa: 98
};

describe('StudentFormDialogComponent', () => {
  let fixture: ComponentFixture<StudentFormDialogComponent>;
  let component: StudentFormDialogComponent;
  let studentsServiceMock: jasmine.SpyObj<StudentsService>;
  let classesServiceMock: jasmine.SpyObj<ClassesService>;

  beforeEach(async () => {
    studentsServiceMock = jasmine.createSpyObj('StudentsService', ['getNextStudentCode', 'createStudent']);
    classesServiceMock = jasmine.createSpyObj('ClassesService', ['getAll']);

    studentsServiceMock.getNextStudentCode.and.returnValue(of({
      status: 'success',
      data: { studentCode: 'STD-2026-006' }
    }));
    classesServiceMock.getAll.and.returnValue(of([
      { id: 'c1', name: '1/1', displayNameArabic: 'الصف الأول الإعدادي - فصل 1/1', gradeLevel: 'الصف الأول الإعدادي' },
      { id: 'c2', name: '2/1', displayNameArabic: 'الصف الثاني الإعدادي - فصل 2/1', gradeLevel: 'الصف الثاني الإعدادي' },
      { id: 'c3', name: '3/1', displayNameArabic: 'الصف الثالث الإعدادي - فصل 3/1', gradeLevel: 'الصف الثالث الإعدادي' }
    ]));

    await TestBed.configureTestingModule({
      imports: [StudentFormDialogComponent],
      providers: [
        ...provideTestDefaults(),
        { provide: StudentsService, useValue: studentsServiceMock },
        { provide: ClassesService, useValue: classesServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StudentFormDialogComponent);
    component = fixture.componentInstance;
  });

  it('suggests the next student code in add mode', () => {
    fixture.detectChanges();
    expect(component.form.get('studentCode')?.value).toBe('STD-2026-006');
  });

  it('filters classes when grade level changes', () => {
    fixture.detectChanges();
    component.form.get('gradeLevel')?.setValue('الصف الثاني الإعدادي');
    expect(component.filteredClasses().length).toBe(1);
    expect(component.form.get('classId')?.value).toBe('c2');
  });

  it('blocks saving a national ID that belongs to another student', () => {
    fixture.componentRef.setInput('existing', [student]);
    fixture.detectChanges();
    const saved = jasmine.createSpy('saved');
    component.saved.subscribe(saved);

    component.form.patchValue({
      fullNameArabic: 'أحمد محمود مصطفى',
      nationalId: student.nationalId,
      studentCode: 'STD-2026-099',
      gradeLevel: 'الصف الأول الإعدادي',
      classId: 'c1',
      guardianName: 'محمود مصطفى',
      guardianPhone: '01011111111',
      enrollmentStatus: 'منتظم'
    });

    component.onSubmit();

    expect(saved).not.toHaveBeenCalled();
    expect(component.serverError()).toContain(student.name);
  });

  it('submits valid new student to the backend API and immediately emits saved student', () => {
    studentsServiceMock.createStudent.and.returnValue(of({
      status: 'success',
      data: {
        id: 'new-id',
        studentCode: 'STD-2026-006',
        fullNameArabic: 'طالب جديد للاختبار',
        nationalId: '31102151234567',
        gradeLevel: 'الصف الأول الإعدادي',
        classId: 'c1',
        guardianName: 'ولي الأمر',
        guardianPhone: '01012345678',
        enrollmentStatus: 'منتظم',
        initialCredentials: {
          identifier: 'STD-2026-006',
          nationalId: '31102151234567',
          initialPassword: 'Student@2026',
          requirePasswordChange: true
        }
      }
    }));

    fixture.detectChanges();

    const saved = jasmine.createSpy('saved');
    component.saved.subscribe(saved);

    component.form.patchValue({
      fullNameArabic: 'طالب جديد للاختبار',
      nationalId: '31102151234567',
      studentCode: 'STD-2026-006',
      gradeLevel: 'الصف الأول الإعدادي',
      classId: 'c1',
      guardianName: 'ولي الأمر',
      guardianPhone: '01012345678',
      enrollmentStatus: 'منتظم'
    });

    component.onSubmit();

    expect(studentsServiceMock.createStudent).toHaveBeenCalledWith({
      fullNameArabic: 'طالب جديد للاختبار',
      nationalId: '31102151234567',
      studentCode: 'STD-2026-006',
      gradeLevel: 'الصف الأول الإعدادي',
      classId: 'c1',
      guardianName: 'ولي الأمر',
      guardianPhone: '01012345678',
      enrollmentStatus: 'منتظم'
    });
    expect(saved).toHaveBeenCalledWith(jasmine.objectContaining({
      name: 'طالب جديد للاختبار',
      code: 'STD-2026-006',
      initialPassword: 'Student@2026'
    }));
  });
});
