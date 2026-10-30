import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTestDefaults } from '../../../testing/test-helpers';
import { TeacherAttendanceComponent } from './teacher-attendance.component';

describe('TeacherAttendanceComponent', () => {
  let component: TeacherAttendanceComponent;
  let fixture: ComponentFixture<TeacherAttendanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherAttendanceComponent],
      providers: provideTestDefaults()
    }).compileComponents();

    fixture = TestBed.createComponent(TeacherAttendanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
