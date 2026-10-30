import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ArabicDatePipe } from '../../shared/pipes/arabic-date.pipe';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { teacherDisplayName } from '../teachers/teacher.model';
import { TeachersStore } from '../teachers/teachers.store';
import { ActivityEvent, ActivityKind, ActorType, PlatformActivityStore, presenceOf } from './platform-activity.store';

type Presence = ReturnType<typeof presenceOf>;
type PresenceFilter = 'ALL' | 'online' | 'inactive';

interface PresenceRow {
  id: string;
  name: string;
  info: string;
  lastSeen: string | null;
  presence: Presence;
  lastEvent: ActivityEvent | null;
}

const PRESENCE_LABELS: Record<Presence, string> = {
  online: 'متصل الآن',
  today: 'نشط اليوم',
  recent: 'نشط مؤخراً',
  inactive: 'غير نشط',
  never: 'لم يسجل دخول بعد'
};

const PRESENCE_STYLES: Record<Presence, { dot: string; text: string }> = {
  online: { dot: 'bg-emerald-500', text: 'text-emerald-700' },
  today: { dot: 'bg-primary-500', text: 'text-primary-700' },
  recent: { dot: 'bg-slate-400', text: 'text-slate-600' },
  inactive: { dot: 'bg-rose-500', text: 'text-rose-600' },
  never: { dot: 'bg-slate-300', text: 'text-slate-400' }
};

const KIND_ICONS: Record<ActivityKind, string> = {
  assignment: '📝',
  file: '📎',
  grades: '📊',
  submission: '✅'
};

@Component({
  selector: 'app-platform-activity',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ArabicDatePipe, TimeAgoPipe],
  templateUrl: './platform-activity.component.html',
  styleUrl: './platform-activity.component.css'
})
export class PlatformActivityComponent {
  private readonly activityStore = inject(PlatformActivityStore);
  private readonly teachersStore = inject(TeachersStore);

  readonly presenceLabels = PRESENCE_LABELS;
  readonly presenceStyles = PRESENCE_STYLES;
  readonly kindIcons = KIND_ICONS;

  readonly tabs: { id: ActorType; label: string }[] = [
    { id: 'teacher', label: 'المعلمون' },
    { id: 'student', label: 'الطلاب' }
  ];
  readonly presenceFilters: { id: PresenceFilter; label: string }[] = [
    { id: 'ALL', label: 'الكل' },
    { id: 'online', label: 'متصل الآن' },
    { id: 'inactive', label: 'غير نشط' }
  ];

  readonly activeTab = signal<ActorType>('teacher');
  readonly presenceFilter = signal<PresenceFilter>('ALL');
  readonly searchQuery = signal('');

  readonly feed = computed(() => this.activityStore.events().filter(e => e.actorType === this.activeTab()));

  readonly rows = computed<PresenceRow[]>(() => {
    const latestEvent = new Map<string, ActivityEvent>();
    for (const event of this.feed()) {
      // feed is newest-first, so the first event per actor is their latest
      if (!latestEvent.has(event.actorId)) latestEvent.set(event.actorId, event);
    }

    const rows: PresenceRow[] = this.activeTab() === 'teacher'
      ? this.teachersStore.teachers().map(t => {
          const lastSeen = this.activityStore.teacherLastSeen()[t.id] ?? null;
          return { id: t.id, name: teacherDisplayName(t), info: t.specialization, lastSeen, presence: presenceOf(lastSeen), lastEvent: latestEvent.get(t.id) ?? null };
        })
      : this.activityStore.students().map(s => ({
          id: s.id, name: s.name, info: `فصل ${s.section}`, lastSeen: s.lastSeen, presence: presenceOf(s.lastSeen), lastEvent: latestEvent.get(s.id) ?? null
        }));

    // Most recently seen first; never-logged-in at the bottom
    return rows.sort((a, b) => (b.lastSeen ?? '').localeCompare(a.lastSeen ?? ''));
  });

  readonly summary = computed(() => {
    const rows = this.rows();
    return {
      total: rows.length,
      online: rows.filter(r => r.presence === 'online').length,
      today: rows.filter(r => r.presence === 'online' || r.presence === 'today').length,
      inactive: rows.filter(r => r.presence === 'inactive' || r.presence === 'never').length
    };
  });

  readonly filteredRows = computed(() => {
    const q = this.searchQuery().trim();
    const filter = this.presenceFilter();
    return this.rows().filter(row => {
      const matchSearch = !q || row.name.includes(q);
      const matchPresence =
        filter === 'ALL' ||
        (filter === 'online' && row.presence === 'online') ||
        (filter === 'inactive' && (row.presence === 'inactive' || row.presence === 'never'));
      return matchSearch && matchPresence;
    });
  });

  selectTab(tab: ActorType): void {
    this.activeTab.set(tab);
    this.presenceFilter.set('ALL');
    this.searchQuery.set('');
  }
}
