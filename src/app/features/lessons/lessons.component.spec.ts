import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { loginAs, provideTestDefaults } from '../../../testing/test-helpers';
import { slotKey } from '../teachers/teacher.model';
import { LessonsComponent } from './lessons.component';

const API = 'http://localhost:5000/api/v1/schedules';

describe('LessonsComponent', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LessonsComponent],
      providers: provideTestDefaults()
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => localStorage.removeItem('sch_user_profile'));

  function create(): LessonsComponent {
    const fixture = TestBed.createComponent(LessonsComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('shows a teacher the schedule the admin saved for them, period by period', () => {
    loginAs('TEACHER');
    const component = create();
    http.expectOne(req => req.url === `${API}/my-schedule`).flush({
      data: {
        schedule: {
          [slotKey(0, 0)]: { day: 0, period: 1, className: '3/2', subject: 'الرياضيات' },
          [slotKey(0, 2)]: { day: 0, period: 3, className: '3/3', subject: 'الرياضيات' }
        }
      }
    });
    component.selectedDayIndex.set(0);

    expect(component.state()).toBe('ready');
    expect(component.dayPeriods().map(p => p.slot?.section ?? null)).toEqual(['3/2', null, '3/3', null, null, null, null]);
    expect(component.weekStats().weekly).toBe(2);
    expect(component.weekStats().classes).toBe(2);
  });

  it('shows nothing made up while the admin has not scheduled the teacher', () => {
    loginAs('TEACHER');
    const component = create();
    http.expectOne(req => req.url === `${API}/my-schedule`).flush({ data: { schedule: {} } });

    expect(component.state()).toBe('ready');
    expect(component.hasSchedule()).toBeFalse();
    expect(component.weekStats().weekly).toBe(0);
  });

  it("shows a student their class's lessons with the teacher of each period", () => {
    loginAs('STUDENT');
    const component = create();
    http.expectOne(req => req.url === `${API}/my-class`).flush({
      data: {
        className: '2/3',
        schedule: [
          { dayOfWeek: 1, dayName: 'الإثنين', period: 2, time: '08:50 - 09:35 AM', subject: 'اللغة العربية', teacherName: 'أ. سعاد محمود' }
        ]
      }
    });
    component.selectedDayIndex.set(1);

    expect(component.className()).toBe('2/3');
    expect(component.studentDay().map(p => p.lesson?.subject ?? null)).toEqual([null, 'اللغة العربية', null, null, null, null, null]);
    expect(component.lessonsOn(0)).toBe(0);
  });

  it('tells a student who is not in a class yet instead of showing a schedule', () => {
    loginAs('STUDENT');
    const component = create();
    http.expectOne(req => req.url === `${API}/my-class`).flush({ message: 'الطالب غير مقيد في أي فصل' }, { status: 404, statusText: 'Not Found' });

    expect(component.state()).toBe('no-class');
    expect(component.hasLessons()).toBeFalse();
  });
});
