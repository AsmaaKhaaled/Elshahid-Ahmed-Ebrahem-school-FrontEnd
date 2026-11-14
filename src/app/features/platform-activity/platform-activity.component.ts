import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ArabicDatePipe } from '../../shared/pipes/arabic-date.pipe';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { teacherDisplayName } from '../teachers/teacher.model';
import { TeachersStore } from '../teachers/teachers.store';
import { ActivityEvent, ActivityKind, ActorType, PlatformActivityStore, presenceOf } from './platform-activity.store';
import { CardTableDirective } from '../../shared/directives/card-table.directive';

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
  curriculum: '📘',
  quiz: '❓',
  grades: '📊',
  submission: '✅'
};

@Component({
  selector: 'app-platform-activity',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardTableDirective, FormsModule, ArabicDatePipe, TimeAgoPipe],
  templateUrl: './platform-activity.component.html',
  styleUrl: './platform-activity.component.css'
})
export class PlatformActivityComponent {
  private readonly activityStore = inject(PlatformActivityStore);
  private readonly teachersStore = inject(TeachersStore);

  constructor() {
    this.teachersStore.ensureLoaded();
    this.activityStore.loadPublished();
  }

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

    // Uploading or handing something in counts as being seen
    const seenAt = (lastSeen: string | null | undefined, event: ActivityEvent | undefined) =>
      [lastSeen, event?.at].filter((at): at is string => !!at).sort().pop() ?? null;

    const counts = this.activityStore.teacherContentCounts();
    const rows: PresenceRow[] = this.activeTab() === 'teacher'
      ? this.teachersStore.teachers().map(t => {
          const lastEvent = latestEvent.get(t.id);
          const lastSeen = seenAt(this.activityStore.teacherLastSeen()[t.id], lastEvent);
          const published = counts[t.id];
          const info = published
            ? `${t.specialization} · ${published.curricula} منهج · ${published.materials} مادة · ${published.assignments} واجب · ${published.quizzes} كويز/اختبار`
            : `${t.specialization} · لم ينشر محتوى بعد`;
          return { id: t.id, name: teacherDisplayName(t), info, lastSeen, presence: presenceOf(lastSeen), lastEvent: lastEvent ?? null };
        })
      : this.activityStore.students().map(s => {
          const lastEvent = latestEvent.get(s.id);
          const lastSeen = seenAt(s.lastSeen, lastEvent);
          return { id: s.id, name: s.name, info: `فصل ${s.section}`, lastSeen, presence: presenceOf(lastSeen), lastEvent: lastEvent ?? null };
        });

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
