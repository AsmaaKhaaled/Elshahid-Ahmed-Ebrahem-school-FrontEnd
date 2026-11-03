import { ComponentFixture, TestBed } from '@angular/core/testing';
import { loginAs, provideTestDefaults } from '../../../testing/test-helpers';
import { AcademicCalendarStore } from '../../core/academic/academic-calendar.store';
import { slotKey } from '../teachers/teacher.model';
import { TeachersStore } from '../teachers/teachers.store';
import { LessonsComponent } from './lessons.component';

describe('LessonsComponent', () => {
  let component: LessonsComponent;
  let fixture: ComponentFixture<LessonsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LessonsComponent],
      providers: provideTestDefaults()
    }).compileComponents();

    fixture = TestBed.createComponent(LessonsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it("shows a teacher the schedule the admin set for them, period by period", () => {
    loginAs('TEACHER');
    const termId = TestBed.inject(AcademicCalendarStore).currentTermId();
    TestBed.inject(TeachersStore).saveSchedule(component.scope.teacherId(), termId, {
      [slotKey(0, 0)]: { subject: 'الرياضيات', section: '3/2' },
      [slotKey(0, 2)]: { subject: 'الرياضيات', section: '3/3' }
    });
    component.selectedDayIndex.set(0);

    expect(component.isDemoSchedule()).toBeFalse();
    expect(component.dayPeriods().map(p => p.slot?.section ?? null)).toEqual(['3/2', null, '3/3', null, null, null, null]);
    expect(component.weekStats().weekly).toBe(2);
    expect(component.weekStats().classes).toBe(2);
  });

  it('falls back to a demo week of their own classes until the admin schedules them', () => {
    loginAs('TEACHER');
    expect(component.isDemoSchedule()).toBeTrue();
    const sections = new Set(Object.values(component.mySchedule()).map(s => s.section));
    expect([...sections].every(s => component.scope.sections().includes(s))).toBeTrue();
  });
});
