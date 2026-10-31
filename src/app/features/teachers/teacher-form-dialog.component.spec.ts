import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgForm } from '@angular/forms';
import { provideTestDefaults } from '../../../testing/test-helpers';
import { makeTeacher } from '../../../testing/teacher-fixtures';
import { TeacherFormDialogComponent, TeacherFormResult } from './teacher-form-dialog.component';

function validForm(): NgForm {
  return { invalid: false, control: { markAllAsTouched: () => {} } } as unknown as NgForm;
}

describe('TeacherFormDialogComponent', () => {
  let component: TeacherFormDialogComponent;
  let fixture: ComponentFixture<TeacherFormDialogComponent>;

  async function open(teacher = makeTeacher('1', 'أحمد علي', { classes: ['3/3', '3/2'] }) as ReturnType<typeof makeTeacher> | null): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [TeacherFormDialogComponent],
      providers: provideTestDefaults()
    }).compileComponents();
    fixture = TestBed.createComponent(TeacherFormDialogComponent);
    fixture.componentRef.setInput('teacher', teacher);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('groups the class picker by grade', async () => {
    await open(null);
    expect(component.classGroups().map(g => g.sections.length)).toEqual([4, 4, 4]);

    // "1/A" (an extra class in the database) still lands under its grade; anything else goes last
    fixture.componentRef.setInput('classOptions', ['1/1', '1/A', '3/2', 'معمل']);
    expect(component.classGroups().map(g => g.sections)).toEqual([['1/1', '1/A'], [], ['3/2'], ['معمل']]);
  });

  it('emits the chosen classes (sorted) with the password', async () => {
    await open();
    const results: TeacherFormResult[] = [];
    component.saved.subscribe(result => results.push(result));

    component.password = 'NewPass99';
    component.save(validForm());
    component.save(validForm());

    expect(results.length).toBe(1);
    expect(results[0].teacher.classes).toEqual(['3/2', '3/3']);
    expect(results[0].password).toBe('NewPass99');
  });

  it('asks for the initial password only when adding a teacher', async () => {
    await open(null);
    // The dialog is moved to <body>
    const password = document.body.querySelector<HTMLInputElement>('input[name="password"]')!;
    expect(password.required).toBeTrue();
    expect(document.body.textContent).toContain('كلمة المرور المبدئية');
  });

  it('unlocks and shows the server message when saving fails', async () => {
    await open();
    component.save(validForm());
    fixture.componentRef.setInput('saving', true);
    fixture.detectChanges();
    fixture.componentRef.setInput('saving', false);
    fixture.componentRef.setInput('serverError', 'الرقم القومي مسجل بالفعل لحساب آخر');
    fixture.detectChanges();

    expect(component.lock.busy()).toBeFalse();
    expect(document.body.textContent).toContain('الرقم القومي مسجل بالفعل');
  });

  afterEach(() => fixture?.destroy());
});
