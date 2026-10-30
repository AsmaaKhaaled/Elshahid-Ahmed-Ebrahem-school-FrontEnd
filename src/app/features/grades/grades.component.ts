import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';

interface GradeItem {
  subject: string;
  coursework: number;
  midterm: number;
  finalExam: number;
  maxScore: number;
  evaluation: string;
}

@Component({
  selector: 'app-grades',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './grades.component.html',
  styleUrl: './grades.component.css'
})
export class GradesComponent {
  readonly grades = signal<GradeItem[]>([
    { subject: 'Advanced English', coursework: 20, midterm: 30, finalExam: 48, maxScore: 100, evaluation: 'امتياز (A+)' },
    { subject: 'Pure Mathematics', coursework: 20, midterm: 29, finalExam: 49, maxScore: 100, evaluation: 'امتياز (A+)' },
    { subject: 'Chemistry (لغات)', coursework: 19, midterm: 28, finalExam: 47, maxScore: 100, evaluation: 'امتياز (A)' },
    { subject: 'اللغة العربية والتربية الإسلامية', coursework: 18, midterm: 28, finalExam: 46, maxScore: 100, evaluation: 'امتياز (A)' },
    { subject: 'French Language', coursework: 10, midterm: 14, finalExam: 24, maxScore: 50, evaluation: 'امتياز (A+)' }
  ]);

  readonly totalScore = computed(() => {
    return this.grades().reduce((sum, item) => sum + item.coursework + item.midterm + item.finalExam, 0);
  });

  readonly maxTotalScore = computed(() => {
    return this.grades().reduce((sum, item) => sum + item.maxScore, 0);
  });

  readonly overallPercentage = computed(() => {
    return ((this.totalScore() / this.maxTotalScore()) * 100).toFixed(1);
  });
}

