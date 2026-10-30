import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTestDefaults } from '../../../../testing/test-helpers';
import { TermEndAlertComponent } from './term-end-alert.component';

describe('TermEndAlertComponent', () => {
  let component: TermEndAlertComponent;
  let fixture: ComponentFixture<TermEndAlertComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TermEndAlertComponent],
      providers: provideTestDefaults()
    }).compileComponents();

    fixture = TestBed.createComponent(TermEndAlertComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
