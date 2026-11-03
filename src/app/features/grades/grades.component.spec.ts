import { TestBed } from '@angular/core/testing';
import { loginAs, provideTestDefaults } from '../../../testing/test-helpers';
import { GradesComponent } from './grades.component';
import { GradebookStore } from './gradebook.store';
import { monthAverage, termMonths, weekStart, weekTotal } from './gradebook.model';

describe('GradesComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GradesComponent],
      providers: provideTestDefaults()
    }).compileComponents();
  });

  function create() {
    const fixture = TestBed.createComponent(GradesComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('splits the term into months of four Saturday weeks', () => {
    const months = termMonths('2026-09-19', '2026-11-03');
    expect(months.map(m => m.weeks[0])).toEqual(['2026-09-19', '2026-10-17']);
    expect(months[0].weeks).toEqual(['2026-09-19', '2026-09-26', '2026-10-03', '2026-10-10']);
    expect(weekStart('2026-11-03')).toBe('2026-10-31');
  });

  it('totals a week out of 40 and averages the month over the weeks with marks', () => {
    expect(weekTotal({ weekly: 18, homework: 10, behavior: 9 })).toBe(37);
    expect(weekTotal({})).toBeNull();
    const avg = monthAverage([{ weekly: 20, homework: 10, behavior: 10 }, { weekly: 10, homework: 5, behavior: 5 }, undefined]);
    expect(avg).toEqual({ weekly: 15, homework: 7.5, behavior: 7.5, total: 30 });
  });

  it('lets the teacher record a week and refuses marks over the maximum', () => {
    loginAs('TEACHER');
    const { component } = create();
    const store = TestBed.inject(GradebookStore);
    const week = component.month()!.weeks.find(w => !component.isFutureWeek(w))!;
    const student = component.students()[0];

    component.setMark(week, student.id, 'homework', '12');
    expect(component.isInvalid(week, student.id, 'homework')).toBeTrue();
    component.save();
    expect(component.error()).toContain('أكبر من الدرجة النهائية');

    component.setMark(week, student.id, 'homework', '9');
    component.setMark(week, student.id, 'weekly', '17');
    component.setMark(week, student.id, 'behavior', '10');
    component.save();
    expect(component.dirty()).toBeFalse();
    expect(store.weeksOf(component.selectedSection(), component.selectedSubject())[week][student.id]).toEqual({ homework: 9, weekly: 17, behavior: 10 });
    expect(weekTotal(component.marksOf(week, student.id))).toBe(36);
  });

  it('shows a student only their own marks, view only', () => {
    loginAs('STUDENT');
    const { fixture, component } = create();
    expect(component.mySubjects().length).toBeGreaterThan(0);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('input').length).toBe(0);
  });
});
