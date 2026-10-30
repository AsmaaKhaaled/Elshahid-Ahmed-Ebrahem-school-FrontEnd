import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgForm } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { provideTestDefaults } from '../../../testing/test-helpers';
import { AdminFormDialogComponent, AdminFormResult } from './admin-form-dialog.component';

describe('AdminFormDialogComponent', () => {
  let component: AdminFormDialogComponent;
  let fixture: ComponentFixture<AdminFormDialogComponent>;
  let saved: AdminFormResult | undefined;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminFormDialogComponent],
      providers: provideTestDefaults()
    }).compileComponents();

    fixture = TestBed.createComponent(AdminFormDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('takenNationalIds', ['28001011234567']);
    saved = undefined;
    component.saved.subscribe(result => (saved = result));
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  function form(): NgForm {
    return fixture.debugElement.query(By.directive(NgForm)).injector.get(NgForm);
  }

  async function fillValidForm(): Promise<void> {
    component.draft.fullName = 'أ. مسؤول جديد';
    component.draft.nationalId = '29001011234500';
    component.draft.jobTitle = 'مسؤول الكنترول';
    component.password = 'Control2026';
    component.confirmPassword = 'Control2026';
    component.togglePermission('exams', true);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('emits the new admin with the password and chosen permissions', async () => {
    await fillValidForm();
    component.save(form());

    expect(saved?.account.permissions).toEqual(['exams']);
    expect(saved?.password).toBe('Control2026');
    expect(saved?.account.id).toBeTruthy();
  });

  it('requires at least one permission', async () => {
    await fillValidForm();
    component.togglePermission('exams', false);
    component.save(form());

    expect(saved).toBeUndefined();
  });

  it('rejects a national ID that belongs to another account', async () => {
    await fillValidForm();
    component.draft.nationalId = '28001011234567';
    fixture.detectChanges();
    await fixture.whenStable();
    component.save(form());

    expect(saved).toBeUndefined();
    expect(form().controls['nationalId'].hasError('taken')).toBeTrue();
  });

  it('rejects passwords that do not match', async () => {
    await fillValidForm();
    component.confirmPassword = 'Different2026';
    fixture.detectChanges();
    await fixture.whenStable();
    component.save(form());

    expect(saved).toBeUndefined();
    expect(form().controls['confirmPassword'].hasError('mismatch')).toBeTrue();
  });
});
