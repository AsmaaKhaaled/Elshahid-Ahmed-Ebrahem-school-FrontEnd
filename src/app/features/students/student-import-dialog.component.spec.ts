import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideTestDefaults } from '../../../testing/test-helpers';
import { StudentImportDialogComponent } from './student-import-dialog.component';
import { StudentsService } from '../../core/services/students.service';

describe('StudentImportDialogComponent', () => {
  let fixture: ComponentFixture<StudentImportDialogComponent>;
  let component: StudentImportDialogComponent;
  let studentsServiceMock: jasmine.SpyObj<StudentsService>;

  beforeEach(async () => {
    studentsServiceMock = jasmine.createSpyObj('StudentsService', ['uploadExcel', 'downloadTemplate']);
    studentsServiceMock.downloadTemplate.and.returnValue(of(new Blob(['fake-excel-content'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })));

    await TestBed.configureTestingModule({
      imports: [StudentImportDialogComponent],
      providers: [
        ...provideTestDefaults(),
        { provide: StudentsService, useValue: studentsServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StudentImportDialogComponent);
    component = fixture.componentInstance;
  });

  it('creates successfully', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.selectedFile()).toBeNull();
  });

  it('downloads the official template via studentsService', () => {
    fixture.detectChanges();
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:http://localhost/fake-url');
    spyOn(window.URL, 'revokeObjectURL');

    component.downloadTemplate();

    expect(studentsServiceMock.downloadTemplate).toHaveBeenCalled();
  });

  it('accepts valid excel file', () => {
    fixture.detectChanges();
    const file = new File(['content'], 'students.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    component.handleFile(file);

    expect(component.selectedFile()).toBe(file);
    expect(component.errorMessage()).toBeNull();
  });

  it('rejects invalid file extension with clear error', () => {
    fixture.detectChanges();
    const file = new File(['content'], 'document.pdf', { type: 'application/pdf' });
    component.handleFile(file);

    expect(component.selectedFile()).toBeNull();
    expect(component.errorMessage()).toContain('نوع الملف غير مدعوم');
  });

  it('uploads file and displays result report', () => {
    const file = new File(['content'], 'students.xlsx');
    studentsServiceMock.uploadExcel.and.returnValue(of({
      status: 'success',
      data: {
        totalRows: 10,
        importedCount: 9,
        failedCount: 1,
        errors: [{ row: 5, name: 'طالب مخالف', error: 'الرقم القومي مكرر' }],
        students: [
          {
            id: 'std-1',
            studentCode: 'STD-2026-001',
            fullNameArabic: 'أحمد علي',
            nationalId: '31102151234567',
            gradeLevel: 'الصف الأول الإعدادي',
            class: { name: '1/1' },
            enrollmentStatus: 'منتظم'
          }
        ]
      }
    }));

    fixture.detectChanges();
    component.selectedFile.set(file);
    component.onUpload();

    expect(studentsServiceMock.uploadExcel).toHaveBeenCalledWith(file);
    expect(component.importResult()).toBeTruthy();
    expect(component.importResult()?.totalRows).toBe(10);
    expect(component.importResult()?.importedCount).toBe(9);
    expect(component.importResult()?.failedCount).toBe(1);
  });
});

