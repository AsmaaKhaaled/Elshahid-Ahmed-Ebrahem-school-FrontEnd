import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgForm } from '@angular/forms';
import { provideTestDefaults } from '../../../testing/test-helpers';
import { ExamScheduleDetails, ExamScheduleDialogComponent } from './exam-schedule-dialog.component';
import { ExamSchedule } from './exams.store';

describe('ExamScheduleDialogComponent', () => {
  let component: ExamScheduleDialogComponent;
  let fixture: ComponentFixture<ExamScheduleDialogComponent>;

  async function create(schedule: ExamSchedule | null): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ExamScheduleDialogComponent],
      providers: provideTestDefaults()
    }).compileComponents();

    fixture = TestBed.createComponent(ExamScheduleDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('termLabel', 'الفصل الدراسي الأول 2026/2027');
    fixture.componentRef.setInput('schedule', schedule);
    fixture.detectChanges();
  }

  afterEach(() => fixture.destroy());

  it('should create', async () => {
    await create(null);
    expect(component).toBeTruthy();
  });

  it('loads the existing schedule details when editing', async () => {
    await create({
      id: 's1', termId: '2026-2027-T1', type: 'امتحان نصف الترم', title: 'نصف الترم', gradeId: 'G3', published: true, entries: []
    });
    expect(component.draft).toEqual({ type: 'امتحان نصف الترم', gradeId: 'G3', title: 'نصف الترم' });
  });

  it('emits the trimmed details on save', async () => {
    await create(null);
    let saved: ExamScheduleDetails | undefined;
    component.saved.subscribe(details => (saved = details));

    component.draft = { type: 'تقييم شهري', gradeId: 'G2', title: '  تقييم نوفمبر  ' };
    component.save({ invalid: false } as NgForm);

    expect(saved).toEqual({ type: 'تقييم شهري', gradeId: 'G2', title: 'تقييم نوفمبر' });
  });
});
