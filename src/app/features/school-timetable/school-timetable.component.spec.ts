import { ComponentFixture, TestBed } from '@angular/core/testing';
import { loginAs, provideTestDefaults } from '../../../testing/test-helpers';
import { makeTeacher } from '../../../testing/teacher-fixtures';
import { AcademicCalendarStore } from '../../core/academic/academic-calendar.store';
import { slotKey } from '../teachers/teacher.model';
import { TeachersStore } from '../teachers/teachers.store';
import { SchoolTimetableComponent } from './school-timetable.component';

describe('SchoolTimetableComponent', () => {
  let fixture: ComponentFixture<SchoolTimetableComponent>;
  let component: SchoolTimetableComponent;
  let store: TeachersStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SchoolTimetableComponent],
      providers: provideTestDefaults()
    }).compileComponents();
    loginAs('SUPER_ADMIN');
    store = TestBed.inject(TeachersStore);
    store.teachers.set([
      makeTeacher('1', 'محمود عبد العزيز الشناوي'),
      makeTeacher('2', 'نادية كمال الشربيني', { specialization: 'اللغة الإنجليزية' })
    ]);
    store.saveSchedule('1', TestBed.inject(AcademicCalendarStore).currentTermId(), {
      [slotKey(0, 0)]: { subject: 'الرياضيات', section: '3/1' }
    });
    fixture = TestBed.createComponent(SchoolTimetableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.removeItem('sch_user_profile'));

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('shows the selected class timetable with each lesson’s subject and teacher', () => {
    component.selectedSection.set('3/1');
    fixture.detectChanges();

    expect(text()).toContain('جدول فصل 3/1');
    expect(text()).toContain('أ. محمود عبد العزيز الشناوي');
    expect(component.conflicts()).toEqual([]);
  });

  it('flags two teachers booked in the same class and period', () => {
    const termId = component.selectedTermId();
    const busy = slotKey(0, 0);
    store.saveSchedule('1', termId, { [busy]: { subject: 'الرياضيات', section: '1/1' } });
    store.saveSchedule('2', termId, { [busy]: { subject: 'اللغة الإنجليزية', section: '1/1' } });
    fixture.detectChanges();

    expect(component.conflicts().length).toBe(1);
    expect(text()).toContain('فصل 1/1 — الأحد الحصة 1');

    component.showConflict('1/1', 0);
    fixture.detectChanges();
    expect(component.selectedSection()).toBe('1/1');
    expect(fixture.nativeElement.querySelectorAll('td.bg-rose-50').length).toBe(1);
  });

  it('lists every teacher with the class they teach in each period of the chosen day', () => {
    component.view.set('teachers');
    component.selectedDay.set(1);
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(store.teachers().length);
    expect(text()).toContain('يوم الإثنين');
  });
});
