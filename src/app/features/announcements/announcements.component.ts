import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ArabicDatePipe } from '../../shared/pipes/arabic-date.pipe';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { AnnouncementFormDialogComponent } from './announcement-form-dialog.component';
import { PublicHeaderComponent } from '../../shared/components/public-header/public-header.component';
import { PublicFooterComponent } from '../../shared/components/public-footer/public-footer.component';
import { AuthService } from '../../core/auth/auth.service';
import { AcademicCalendarStore } from '../../core/academic/academic-calendar.store';
import {
  ANNOUNCEMENT_CATEGORIES,
  Announcement,
  AnnouncementCategory,
  AnnouncementsStore,
  audienceLabel,
  isExpired
} from './announcements.store';

const CATEGORY_STYLES: Record<AnnouncementCategory, string> = {
  'عاجل وهام': 'bg-rose-50 text-rose-700',
  'إداري': 'bg-primary-50 text-primary-700',
  'الزوار': 'bg-amber-50 text-amber-700',
  'أنشطة وفعاليات': 'bg-emerald-50 text-emerald-700'
};

type CategoryFilter = 'الكل' | AnnouncementCategory | 'المنتهية';

const ARABIC_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

/** Spelling-tolerant Arabic for searching: اكتوبر finds أكتوبر, Arabic digits match Latin ones. */
export function normalizeSearch(text: string): string {
  return text
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** "2026-10" for an announcement published in October 2026 (local time). */
export function monthKeyOf(isoDate: string): string {
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** "أكتوبر 2026" */
export function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return `${ARABIC_MONTHS[month - 1]} ${year}`;
}

/**
 * The month a search names, e.g. "أكتوبر", "شهر اكتوبر" or "أكتوبر 2026", as a test on a month key;
 * null when the search isn't a month.
 */
export function monthFromSearch(query: string): ((key: string) => boolean) | null {
  const words = normalizeSearch(query).split(' ').filter(w => w && w !== 'شهر');
  const month = ARABIC_MONTHS.findIndex(name => words.includes(normalizeSearch(name)));
  if (month < 0) return null;
  const year = words.find(w => /^\d{4}$/.test(w));
  // Only the month (and maybe the year) - any other word makes it a normal text search
  if (words.length > (year ? 2 : 1)) return null;
  const monthPart = `-${String(month + 1).padStart(2, '0')}`;
  return key => key.endsWith(monthPart) && (!year || key.startsWith(year));
}

@Component({
  selector: 'app-announcements',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    ArabicDatePipe,
    TimeAgoPipe,
    AnnouncementFormDialogComponent,
    PublicHeaderComponent,
    PublicFooterComponent
  ],
  templateUrl: './announcements.component.html',
  styleUrl: './announcements.component.css',
  host: { class: 'block min-h-screen' }
})
export class AnnouncementsComponent implements OnInit {
  readonly store = inject(AnnouncementsStore);
  readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly academicYear = inject(AcademicCalendarStore).currentYear;

  readonly categoryStyles = CATEGORY_STYLES;
  readonly audienceLabel = audienceLabel;
  readonly isExpired = isExpired;
  readonly isAdmin = this.store.isAdmin;

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly userRole = this.authService.userRole;
  readonly isTeacher = computed(() => this.userRole() === 'TEACHER');
  readonly isStudent = computed(() => this.userRole() === 'STUDENT');
  readonly isPublicPage = computed(() => this.router.url === '/announcements' || this.router.url.startsWith('/announcements?'));

  readonly searchQuery = signal('');
  readonly selectedFilter = signal<CategoryFilter>('الكل');
  // '' = every month, else "2026-10"
  readonly selectedMonth = signal('');
  readonly confirmingDeleteId = signal<string | null>(null);
  readonly formOpen = signal(false);
  readonly editing = signal<Announcement | null>(null);
  readonly unreadCount = this.store.unreadCount;

  markAsRead(item: Announcement): void {
    if (!item.isRead) {
      this.store.markAsRead(item.id);
    }
  }

  markAllAsRead(): void {
    this.store.markAllAsRead();
  }

  // Every month of the school year so far (from September), plus older months that have announcements;
  // newest first, each with its number of announcements
  readonly monthOptions = computed(() => {
    const counts = new Map<string, number>();
    for (const a of this.store.visible()) {
      const key = monthKeyOf(a.publishedAt);
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const keys = new Set(counts.keys());
    const thisMonth = monthKeyOf(new Date().toISOString());
    let [year, month] = [Number(this.academicYear().slice(0, 4)), 9];
    for (let key = `${year}-09`; key <= thisMonth; key = `${year}-${String(month).padStart(2, '0')}`) {
      keys.add(key);
      [year, month] = month === 12 ? [year + 1, 1] : [year, month + 1];
    }
    return [...keys]
      .sort((a, b) => b.localeCompare(a))
      .map(key => {
        const [name, keyYear] = monthLabel(key).split(' ');
        return { key, name, year: keyYear, label: monthLabel(key), count: counts.get(key) ?? 0 };
      });
  });

  readonly selectedMonthLabel = computed(() => (this.selectedMonth() ? monthLabel(this.selectedMonth()) : 'كل الشهور'));
  readonly monthMenuOpen = signal(false);

  pickMonth(key: string): void {
    this.selectedMonth.set(key);
    this.monthMenuOpen.set(false);
  }

  // The search names a month ("أكتوبر", "شهر اكتوبر 2026")
  private readonly searchedMonth = computed(() => monthFromSearch(this.searchQuery()));

  // The announcements of the picked month; looking up a month shows all of it, expired ones too
  private readonly inMonth = computed(() => {
    const month = this.selectedMonth();
    const searched = this.searchedMonth();
    const q = normalizeSearch(this.searchQuery());
    return this.store.visible().filter(a => {
      const key = monthKeyOf(a.publishedAt);
      if (month && key !== month) return false;
      // A month search also finds the announcements that mention it ("تقييم أكتوبر")
      return !q || searched?.(key) || normalizeSearch(a.title).includes(q) || normalizeSearch(a.content).includes(q);
    });
  });

  readonly monthFiltered = computed(() => !!this.selectedMonth() || !!this.searchedMonth());

  private isShown(a: Announcement): boolean {
    return this.monthFiltered() || !isExpired(a);
  }

  // Category tabs with counts; "المنتهية" (expired) only matters to admins
  readonly filters = computed(() => {
    const list = this.inMonth();
    const shown = list.filter(a => this.isShown(a));
    const tabs: { id: CategoryFilter; count: number }[] = [
      { id: 'الكل', count: shown.length },
      ...ANNOUNCEMENT_CATEGORIES.map(category => ({ id: category, count: shown.filter(a => a.category === category).length }))
    ];
    if (this.isAdmin()) {
      tabs.push({ id: 'المنتهية', count: list.filter(a => isExpired(a)).length });
    }
    return tabs;
  });

  readonly filteredAnnouncements = computed(() => {
    const filter = this.selectedFilter();
    return this.inMonth().filter(a =>
      filter === 'المنتهية' ? isExpired(a) : this.isShown(a) && (filter === 'الكل' || a.category === filter)
    );
  });

  ngOnInit(): void {
    // The dashboard's "إرسال تعميم جديد" opens the form directly (?new=1)
    if (this.isAdmin() && this.route.snapshot.queryParamMap.has('new')) {
      this.openForm(null);
    }
  }

  openForm(announcement: Announcement | null): void {
    this.editing.set(announcement);
    this.formOpen.set(true);
  }

  saveAnnouncement(announcement: Announcement): void {
    this.store.save(announcement);
    this.formOpen.set(false);
  }

  deleteAnnouncement(id: string): void {
    this.store.delete(id);
    this.confirmingDeleteId.set(null);
  }
}
