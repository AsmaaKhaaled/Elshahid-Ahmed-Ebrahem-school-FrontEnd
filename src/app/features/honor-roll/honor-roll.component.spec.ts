import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTestDefaults } from '../../../testing/test-helpers';
import { HonorRollComponent } from './honor-roll.component';

describe('HonorRollComponent', () => {
  let component: HonorRollComponent;
  let fixture: ComponentFixture<HonorRollComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HonorRollComponent],
      providers: provideTestDefaults()
    }).compileComponents();

    fixture = TestBed.createComponent(HonorRollComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows teachers first, then students when switching tabs', () => {
    expect(component.visibleEntries().every(e => e.kind === 'TEACHER')).toBeTrue();

    component.selectedKind.set('STUDENT');
    expect(component.visibleEntries().every(e => e.kind === 'STUDENT')).toBeTrue();
  });
});
