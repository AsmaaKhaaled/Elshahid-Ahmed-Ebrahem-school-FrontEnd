import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTestDefaults } from '../../../testing/test-helpers';
import { PlatformActivityComponent } from './platform-activity.component';

describe('PlatformActivityComponent', () => {
  let component: PlatformActivityComponent;
  let fixture: ComponentFixture<PlatformActivityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlatformActivityComponent],
      providers: provideTestDefaults()
    }).compileComponents();

    fixture = TestBed.createComponent(PlatformActivityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
