import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { loginAs, provideTestDefaults } from '../../../testing/test-helpers';
import { makeTeacher, teacherDto } from '../../../testing/teacher-fixtures';
import { TeachersComponent } from './teachers.component';

const API = 'http://localhost:5000/api/v1/teachers';

describe('TeachersComponent', () => {
  let component: TeachersComponent;
  let fixture: ComponentFixture<TeachersComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeachersComponent],
      providers: provideTestDefaults()
    }).compileComponents();
    loginAs('SUPER_ADMIN');
    http = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(TeachersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(API).flush({ data: { teachers: [teacherDto(makeTeacher('1', 'نشوه يوسف', { classes: ['3/2', '3/3', '3/4'] }))] } });
    http.expectOne(`${API}/class-options`).flush({ data: { classes: ['1/1', '3/2'] } });
    // Each teacher's periods come from the school timetable
    http.expectOne(r => r.url.endsWith('/schedules/school'))
      .flush({ status: 'success', data: { termId: 'T1', totalPeriodsCount: 0, byClass: {}, byTeacher: {}, conflicts: [] } });
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('sch_user_profile');
  });

  it('shows each teacher with the number of classes they teach', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('أ. نشوه يوسف');
    expect(text).toContain('3 فصول');
    expect(text).toContain('3/2، 3/3، 3/4');
    expect(component.classOptions()).toEqual(['1/1', '3/2']);
  });

  it('closes the form once the backend saved the new teacher', () => {
    component.openForm(null);
    component.saveTeacher({ teacher: makeTeacher('', 'أحمد علي', { classes: ['1/1'] }), password: 'Start2026' });

    http.expectOne(r => r.method === 'POST' && r.url === API)
      .flush({ data: { teacher: teacherDto(makeTeacher('2', 'أحمد علي', { classes: ['1/1'] })) } });

    expect(component.showForm()).toBeFalse();
    expect(component.teachers().map(t => t.name)).toEqual(['أحمد علي', 'نشوه يوسف']);
  });

  it('keeps the form open with the server message on a duplicate national ID', () => {
    component.openForm(null);
    component.saveTeacher({ teacher: makeTeacher('', 'أحمد علي'), password: 'Start2026' });

    http.expectOne(r => r.method === 'POST')
      .flush({ message: 'الرقم القومي مسجل بالفعل لحساب آخر' }, { status: 409, statusText: 'Conflict' });

    expect(component.showForm()).toBeTrue();
    expect(component.formError()).toBe('الرقم القومي مسجل بالفعل لحساب آخر');
  });
});
