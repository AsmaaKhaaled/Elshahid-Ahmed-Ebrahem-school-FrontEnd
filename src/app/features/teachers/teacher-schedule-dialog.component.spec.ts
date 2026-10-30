import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTestDefaults } from '../../../testing/test-helpers';
import { TeacherScheduleDialogComponent } from './teacher-schedule-dialog.component';
import { Teacher, TermSchedules, slotKey } from './teacher.model';

function teacher(id: string, subjects = ['الرياضيات']): Teacher {
  return { id, name: `معلم ${id}`, nationalId: '', title: '', specialization: 'الرياضيات', email: '', phone: '', subjects, status: 'على رأس العمل' };
}

const termId = '2026-2027-T1';

describe('TeacherScheduleDialogComponent', () => {
  let component: TeacherScheduleDialogComponent;
  let fixture: ComponentFixture<TeacherScheduleDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherScheduleDialogComponent],
      providers: provideTestDefaults()
    }).compileComponents();

    // Teacher "b" already teaches 1/1 on Sunday, first period
    const schedules: TermSchedules = {
      [termId]: { b: { [slotKey(0, 0)]: { subject: 'العلوم', section: '1/1' } } }
    };

    fixture = TestBed.createComponent(TeacherScheduleDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('teacher', teacher('a'));
    fixture.componentRef.setInput('teachers', [teacher('a'), teacher('b', ['العلوم'])]);
    fixture.componentRef.setInput('schedules', schedules);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('flags a section already taught by another teacher in the same period', () => {
    component.setSlot(slotKey(0, 0), { section: '1/1' });

    expect(component.hasConflicts()).toBeTrue();
    expect(component.conflicts()[slotKey(0, 0)]).toContain('معلم b');
  });

  it('counts the weekly load and distinct sections', () => {
    component.setSlot(slotKey(0, 1), { section: '1/1' });
    component.setSlot(slotKey(1, 1), { section: '1/1' });
    component.setSlot(slotKey(2, 1), { section: '1/2' });

    expect(component.weeklyLoad()).toBe(3);
    expect(component.sectionsCount()).toBe(2);
    expect(component.hasConflicts()).toBeFalse();
  });

  it('clears a period when its section is removed', () => {
    component.setSlot(slotKey(0, 1), { section: '1/1' });
    component.setSlot(slotKey(0, 1), { section: '' });

    expect(component.weeklyLoad()).toBe(0);
  });
});
