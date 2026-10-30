import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTestDefaults } from '../../../testing/test-helpers';
import { TeacherFormDialogComponent } from './teacher-form-dialog.component';

describe('TeacherFormDialogComponent', () => {
  let component: TeacherFormDialogComponent;
  let fixture: ComponentFixture<TeacherFormDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherFormDialogComponent],
      providers: provideTestDefaults()
    }).compileComponents();

    fixture = TestBed.createComponent(TeacherFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
