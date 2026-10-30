import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgForm } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { provideTestDefaults } from '../../../testing/test-helpers';
import { HonorEntryDialogComponent } from './honor-entry-dialog.component';
import { HonorEntry } from './honor-roll.model';

describe('HonorEntryDialogComponent', () => {
  let component: HonorEntryDialogComponent;
  let fixture: ComponentFixture<HonorEntryDialogComponent>;
  let saved: HonorEntry | undefined;

  async function create(kind: 'TEACHER' | 'STUDENT'): Promise<void> {
    fixture = TestBed.createComponent(HonorEntryDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('kind', kind);
    saved = undefined;
    component.saved.subscribe(entry => (saved = entry));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function form(): NgForm {
    return fixture.debugElement.query(By.directive(NgForm)).injector.get(NgForm);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HonorEntryDialogComponent],
      providers: provideTestDefaults()
    }).compileComponents();
  });

  afterEach(() => fixture.destroy());

  it('saves a teacher with the subject only', async () => {
    await create('TEACHER');
    component.draft.name = '  طارق عبد الحميد ';
    component.draft.subject = 'العلوم';
    component.draft.section = '1/1';
    fixture.detectChanges();
    await fixture.whenStable();
    component.save(form());

    expect(saved?.kind).toBe('TEACHER');
    expect(saved?.name).toBe('طارق عبد الحميد');
    expect(saved?.subject).toBe('العلوم');
    expect(saved?.section).toBe('');
  });

  it('requires the class for a student', async () => {
    await create('STUDENT');
    component.draft.name = 'يوسف أحمد';
    fixture.detectChanges();
    await fixture.whenStable();
    component.save(form());

    expect(saved).toBeUndefined();
  });

  it('rejects files that are not images', async () => {
    await create('STUDENT');
    const file = new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' });
    await component.onPhotoSelected({ target: { files: [file], value: '' } } as unknown as Event);

    expect(component.photoError()).toContain('JPG');
    expect(component.photoUrl()).toBe('');
  });
});
