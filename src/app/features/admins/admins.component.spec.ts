import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTestDefaults } from '../../../testing/test-helpers';
import { AdminsComponent } from './admins.component';

describe('AdminsComponent', () => {
  let component: AdminsComponent;
  let fixture: ComponentFixture<AdminsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminsComponent],
      providers: provideTestDefaults()
    }).compileComponents();

    fixture = TestBed.createComponent(AdminsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('suspends and re-activates an admin', () => {
    const admin = component.accounts().find(a => a.role === 'ADMIN')!;

    component.toggleStatus(admin);
    expect(component.accounts().find(a => a.id === admin.id)?.status).toBe('SUSPENDED');

    component.toggleStatus({ ...admin, status: 'SUSPENDED' });
    expect(component.accounts().find(a => a.id === admin.id)?.status).toBe('ACTIVE');
  });

  it('masks the national ID in the list', () => {
    expect(component.maskNationalId('28001011234567')).toBe('2800•••••••567');
  });
});
