import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgForm } from '@angular/forms';
import { provideTestDefaults } from '../../../testing/test-helpers';
import { ExamEntryDialogComponent } from './exam-entry-dialog.component';
import { ExamEntry, ExamSchedule } from './exams.store';

const validForm = { invalid: false } as NgForm;

const schedule: ExamSchedule = {
  id: 'sch-test',
  termId: '2026-2027-T1',
  type: 'تقييم شهري',
  title: 'تقييم تجريبي',
  gradeId: 'G1',
  published: false,
  entries: [
    { id: 'math', subject: 'الرياضيات', date: '2026-11-01', startTime: '09:00', durationMinutes: 60, totalMarks: 20, notes: '' }
  ]
};

describe('ExamEntryDialogComponent', () => {
  let component: ExamEntryDialogComponent;
  let fixture: ComponentFixture<ExamEntryDialogComponent>;
  let saved: ExamEntry[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExamEntryDialogComponent],
      providers: provideTestDefaults()
    }).compileComponents();

    fixture = TestBed.createComponent(ExamEntryDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('schedule', schedule);
    fixture.detectChanges();

    saved = [];
    component.saved.subscribe(entry => saved.push(entry));
  });

  afterEach(() => fixture.destroy());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('rejects a subject that is already in the timetable', () => {
    component.draft = { ...component.draft, subject: 'الرياضيات', date: '2026-11-05', startTime: '09:00' };
    component.save(validForm);

    expect(saved.length).toBe(0);
    expect(component.error()).toContain('الرياضيات');
  });

  it('rejects an exam that overlaps another one on the same day', () => {
    component.draft = { ...component.draft, subject: 'العلوم', date: '2026-11-01', startTime: '09:30', durationMinutes: 45 };
    component.save(validForm);

    expect(saved.length).toBe(0);
    expect(component.error()).toContain('متعارض');
  });

  it('accepts an exam right after the previous one ends', () => {
    component.draft = { ...component.draft, subject: 'العلوم', date: '2026-11-01', startTime: '10:00', durationMinutes: 45 };
    component.save(validForm);

    expect(saved.length).toBe(1);
    expect(saved[0].id).toBeTruthy();
  });

  it('does nothing while the form is invalid', () => {
    const invalidForm = { invalid: true, control: { markAllAsTouched: () => {} } } as unknown as NgForm;
    component.save(invalidForm);

    expect(saved.length).toBe(0);
  });
});
