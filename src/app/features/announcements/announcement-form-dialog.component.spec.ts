import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTestDefaults } from '../../../testing/test-helpers';
import { AnnouncementFormDialogComponent } from './announcement-form-dialog.component';

describe('AnnouncementFormDialogComponent', () => {
  let component: AnnouncementFormDialogComponent;
  let fixture: ComponentFixture<AnnouncementFormDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnnouncementFormDialogComponent],
      providers: provideTestDefaults()
    }).compileComponents();

    fixture = TestBed.createComponent(AnnouncementFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
