import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ArabicDatePipe } from '../../shared/pipes/arabic-date.pipe';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { AnnouncementFormDialogComponent } from './announcement-form-dialog.component';
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
  'أولياء الأمور': 'bg-amber-50 text-amber-700',
  'أنشطة وفعاليات': 'bg-emerald-50 text-emerald-700'
};

type CategoryFilter = 'الكل' | AnnouncementCategory | 'المنتهية';

@Component({
  selector: 'app-announcements',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ArabicDatePipe, TimeAgoPipe, AnnouncementFormDialogComponent],
  templateUrl: './announcements.component.html',
  styleUrl: './announcements.component.css'
})
export class AnnouncementsComponent implements OnInit {
  readonly store = inject(AnnouncementsStore);
  private readonly route = inject(ActivatedRoute);

  readonly categoryStyles = CATEGORY_STYLES;
  readonly audienceLabel = audienceLabel;
  readonly isExpired = isExpired;
  readonly isAdmin = this.store.isAdmin;

  readonly searchQuery = signal('');
  readonly selectedFilter = signal<CategoryFilter>('الكل');
  readonly confirmingDeleteId = signal<string | null>(null);
  readonly formOpen = signal(false);
  readonly editing = signal<Announcement | null>(null);

  // Category tabs with counts; "المنتهية" (expired) only matters to admins
  readonly filters = computed(() => {
    const list = this.store.visible();
    const active = list.filter(a => !isExpired(a));
    const tabs: { id: CategoryFilter; count: number }[] = [
      { id: 'الكل', count: active.length },
      ...ANNOUNCEMENT_CATEGORIES.map(category => ({ id: category, count: active.filter(a => a.category === category).length }))
    ];
    if (this.isAdmin()) {
      tabs.push({ id: 'المنتهية', count: list.length - active.length });
    }
    return tabs;
  });

  readonly filteredAnnouncements = computed(() => {
    const filter = this.selectedFilter();
    const q = this.searchQuery().trim();
    return this.store.visible().filter(a => {
      const matchFilter = filter === 'المنتهية' ? isExpired(a) : !isExpired(a) && (filter === 'الكل' || a.category === filter);
      const matchSearch = !q || a.title.includes(q) || a.content.includes(q);
      return matchFilter && matchSearch;
    });
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
