import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgForm } from '@angular/forms';
import { provideTestDefaults } from '../../../testing/test-helpers';
import { StudentFormDialogComponent } from './student-form-dialog.component';
import { Student } from './student.model';

const student: Student = {
  id: '1', code: 'STD-2026-001', nationalId: '31001011234567', name: 'أحمد ياسين', gradeId: 'G1',
  className: '1/3', guardianName: 'ياسين', guardianPhone: '01001234567', status: 'منتظم', gpa: 98
};
const validForm = { invalid: false } as NgForm;

describe('StudentFormDialogComponent', () => {
  let fixture: ComponentFixture<StudentFormDialogComponent>;
  let component: StudentFormDialogComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentFormDialogComponent],
      providers: provideTestDefaults()
    }).compileComponents();
    fixture = TestBed.createComponent(StudentFormDialogComponent);
    component = fixture.componentInstance;
  });

  it('suggests the next free student code in add mode', () => {
    const year = new Date().getFullYear();
    fixture.componentRef.setInput('existing', [{ ...student, code: `STD-${year}-001` }]);
    fixture.detectChanges();
    expect(component.draft.code).toBe(`STD-${year}-002`);
  });

  it('resets the section when the grade changes', () => {
    fixture.detectChanges();
    component.draft.gradeId = 'G3';
    component.onGradeChange();
    expect(component.draft.className).toBe('3/1');
  });

  it('blocks saving a national ID that belongs to another student', () => {
    fixture.componentRef.setInput('existing', [student]);
    fixture.detectChanges();
    const saved = jasmine.createSpy('saved');
    component.saved.subscribe(saved);

    component.draft = { ...component.draft, name: 'جديد', nationalId: student.nationalId, guardianName: 'ولي', guardianPhone: '01011111111' };
    component.save(validForm);

    expect(saved).not.toHaveBeenCalled();
    expect(component.duplicateError()).toContain(student.name);
  });

  it('lets a student keep their own national ID & code when editing', () => {
    fixture.componentRef.setInput('student', student);
    fixture.componentRef.setInput('existing', [student]);
    fixture.detectChanges();
    const saved = jasmine.createSpy('saved');
    component.saved.subscribe(saved);

    component.draft.status = 'منقول';
    component.save(validForm);

    expect(saved).toHaveBeenCalledWith(jasmine.objectContaining({ id: '1', status: 'منقول', code: 'STD-2026-001' }));
  });
});
