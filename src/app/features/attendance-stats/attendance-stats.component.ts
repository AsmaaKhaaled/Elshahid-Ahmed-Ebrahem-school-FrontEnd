import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { GRADE_LEVELS, SCHOOL_INFO } from '../../core/constants/school.constants';

type StatsPeriod = 'TODAY' | 'WEEK' | 'MONTH' | 'TERM';

interface SectionStats {
  grade: string;
  section: string;
  enrolled: number;
  present: number;
  absent: number;
  excused: number;
}

interface FrequentAbsentee {
  name: string;
  section: string;
  absentDays: number;
}

// Mock absence rate per period (fraction of enrolled students absent on average)
const PERIOD_FACTORS: Record<StatsPeriod, number> = { TODAY: 1, WEEK: 1.15, MONTH: 1.3, TERM: 1.4 };

@Component({
  selector: 'app-attendance-stats',
  standalone: true,
  imports: [MatFormFieldModule, MatSelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './attendance-stats.component.html',
  styleUrl: './attendance-stats.component.css'
})
export class AttendanceStatsComponent {
  readonly school = SCHOOL_INFO;
  readonly grades = GRADE_LEVELS;

  readonly periods: { id: StatsPeriod; label: string }[] = [
    { id: 'TODAY', label: 'اليوم' },
    { id: 'WEEK', label: 'هذا الأسبوع' },
    { id: 'MONTH', label: 'هذا الشهر' },
    { id: 'TERM', label: 'الفصل الدراسي' }
  ];

  readonly selectedPeriod = signal<StatsPeriod>('TODAY');
  readonly selectedGrade = signal<string>('ALL');

  // Base (today) mock figures for every section: 1/1 .. 3/3
  private readonly baseSections: SectionStats[] = [
    { grade: 'الصف الأول الإعدادي', section: '1/1', enrolled: 42, present: 40, absent: 1, excused: 1 },
    { grade: 'الصف الأول الإعدادي', section: '1/2', enrolled: 41, present: 38, absent: 2, excused: 1 },
    { grade: 'الصف الأول الإعدادي', section: '1/3', enrolled: 40, present: 37, absent: 3, excused: 0 },
    { grade: 'الصف الأول الإعدادي', section: '1/4', enrolled: 39, present: 36, absent: 2, excused: 1 },
    { grade: 'الصف الثاني الإعدادي', section: '2/1', enrolled: 43, present: 41, absent: 1, excused: 1 },
    { grade: 'الصف الثاني الإعدادي', section: '2/2', enrolled: 42, present: 38, absent: 3, excused: 1 },
    { grade: 'الصف الثاني الإعدادي', section: '2/3', enrolled: 40, present: 36, absent: 2, excused: 2 },
    { grade: 'الصف الثاني الإعدادي', section: '2/4', enrolled: 41, present: 38, absent: 2, excused: 1 },
    { grade: 'الصف الثالث الإعدادي', section: '3/1', enrolled: 44, present: 42, absent: 2, excused: 0 },
    { grade: 'الصف الثالث الإعدادي', section: '3/2', enrolled: 43, present: 39, absent: 3, excused: 1 },
    { grade: 'الصف الثالث الإعدادي', section: '3/3', enrolled: 41, present: 36, absent: 4, excused: 1 },
    { grade: 'الصف الثالث الإعدادي', section: '3/4', enrolled: 42, present: 39, absent: 2, excused: 1 }
  ];

  readonly frequentAbsentees: FrequentAbsentee[] = [
    { name: 'عمر طارق عبد الله خليل', section: '3/3', absentDays: 8 },
    { name: 'يوسف محمد السيد علي', section: '2/2', absentDays: 7 },
    { name: 'مصطفى أشرف حسن', section: '1/3', absentDays: 6 },
    { name: 'محمود سامح عبد الرحيم', section: '3/2', absentDays: 5 },
    { name: 'زياد هشام فتحي', section: '2/3', absentDays: 4 }
  ];

  readonly sections = computed<SectionStats[]>(() => {
    const factor = PERIOD_FACTORS[this.selectedPeriod()];
    return this.baseSections.map(s => {
      const absent = Math.round(s.absent * factor);
      const excused = Math.round(s.excused * factor);
      return { ...s, absent, excused, present: Math.max(s.enrolled - absent - excused, 0) };
    });
  });

  readonly filteredSections = computed(() => {
    const grade = this.selectedGrade();
    return grade === 'ALL' ? this.sections() : this.sections().filter(s => s.grade === grade);
  });

  readonly gradeSummaries = computed(() =>
    GRADE_LEVELS.map(g => ({ label: g.label, ...this.sum(this.sections().filter(s => s.grade === g.label)) }))
  );

  readonly totals = computed(() => this.sum(this.sections()));

  rate(part: number, total: number): number {
    return total === 0 ? 0 : Math.round((part / total) * 100);
  }

  private sum(list: SectionStats[]) {
    return list.reduce(
      (acc, s) => ({
        enrolled: acc.enrolled + s.enrolled,
        present: acc.present + s.present,
        absent: acc.absent + s.absent,
        excused: acc.excused + s.excused
      }),
      { enrolled: 0, present: 0, absent: 0, excused: 0 }
    );
  }
}
