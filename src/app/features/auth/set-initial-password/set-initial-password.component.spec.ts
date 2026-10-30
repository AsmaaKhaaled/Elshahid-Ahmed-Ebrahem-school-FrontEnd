import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTestDefaults } from '../../../../testing/test-helpers';
import { SetInitialPasswordComponent } from './set-initial-password.component';

describe('SetInitialPasswordComponent', () => {
  let component: SetInitialPasswordComponent;
  let fixture: ComponentFixture<SetInitialPasswordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SetInitialPasswordComponent],
      providers: provideTestDefaults()
    }).compileComponents();

    fixture = TestBed.createComponent(SetInitialPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
