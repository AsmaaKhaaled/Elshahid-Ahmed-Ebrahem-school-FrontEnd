import { ComponentFixture, TestBed } from '@angular/core/testing';
import { loginAs, provideTestDefaults } from '../../../testing/test-helpers';
import { AnnouncementsComponent, monthFromSearch, monthKeyOf, monthLabel } from './announcements.component';
import { Announcement, AnnouncementsStore } from './announcements.store';

describe('AnnouncementsComponent', () => {
  let component: AnnouncementsComponent;
  let fixture: ComponentFixture<AnnouncementsComponent>;

  const announcement = (id: string, title: string, publishedAt: string, expiresAt?: string): Announcement => ({
    id,
    title,
    content: '',
    category: 'إداري',
    audiences: ['TEACHER', 'STUDENT', 'PARENT'],
    author: 'إدارة المدرسة',
    publishedAt,
    expiresAt,
    pinned: false
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnnouncementsComponent],
      providers: provideTestDefaults()
    }).compileComponents();

    fixture = TestBed.createComponent(AnnouncementsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.removeItem('sch_user_profile'));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('reads a month out of the search, however it is spelled', () => {
    expect(monthLabel(monthKeyOf('2026-10-14T09:00:00'))).toBe('أكتوبر 2026');
    expect(monthFromSearch('اكتوبر')?.('2026-10')).toBeTrue();
    expect(monthFromSearch('شهر أكتوبر ٢٠٢٥')?.('2026-10')).toBeFalse();
    expect(monthFromSearch('شهر أكتوبر ٢٠٢٥')?.('2025-10')).toBeTrue();
    expect(monthFromSearch('تقييم أكتوبر')).toBeNull();
  });

  it('shows every announcement of the month typed or picked', () => {
    // Only the admins ever see expired announcements
    loginAs('SUPER_ADMIN');
    TestBed.inject(AnnouncementsStore).announcements.set([
      announcement('a', 'رحلة الأقصر', '2026-10-05T09:00:00'),
      announcement('b', 'مسابقة القراءة', '2026-10-20T09:00:00', '2026-10-25'),
      announcement('c', 'تسليم درجات تقييم أكتوبر', '2026-11-02T09:00:00'),
      announcement('d', 'اجتماع أولياء الأمور', '2026-11-03T09:00:00')
    ]);
    const shown = () => component.filteredAnnouncements().map(a => a.id).sort();

    // The expired one is hidden normally
    expect(shown()).toEqual(['a', 'c', 'd']);

    // Typed: October's announcements, the expired one too, plus the one that mentions it
    component.searchQuery.set('اكتوبر');
    expect(shown()).toEqual(['a', 'b', 'c']);

    // Picked from the list
    component.searchQuery.set('');
    component.selectedMonth.set('2026-10');
    expect(shown()).toEqual(['a', 'b']);
    expect(component.monthOptions().filter(m => m.count).map(m => [m.label, m.count])).toEqual([['نوفمبر 2026', 2], ['أكتوبر 2026', 2]]);
    // The school year's months are listed from September, even without announcements
    expect(component.monthOptions().find(m => m.key === '2026-09')?.count).toBe(0);

    component.selectedMonth.set('');
    expect(shown()).toEqual(['a', 'c', 'd']);
  });
});
