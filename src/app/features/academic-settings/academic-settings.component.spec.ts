import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTestDefaults } from '../../../testing/test-helpers';
import { AcademicSettingsComponent } from './academic-settings.component';

describe('AcademicSettingsComponent', () => {
  let component: AcademicSettingsComponent;
  let fixture: ComponentFixture<AcademicSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AcademicSettingsComponent],
      providers: provideTestDefaults()
    }).compileComponents();

    fixture = TestBed.createComponent(AcademicSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
