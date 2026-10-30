import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ArabicDatePipe } from '../../shared/pipes/arabic-date.pipe';
import { GRADE_LEVELS } from '../../core/constants/school.constants';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

interface AttendanceRecord {
  studentId: string;
  name: string;
  code: string;
  status: AttendanceStatus;
  note?: string;
}

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [FormsModule, ArabicDatePipe, MatFormFieldModule, MatSelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './attendance.component.html',
  styleUrl: './attendance.component.css'
})
export class AttendanceComponent {
  readonly today = new Date();
  readonly grades = GRADE_LEVELS;
  readonly selectedSection = signal<string>(GRADE_LEVELS[0].sections[0]);

  readonly records = signal<AttendanceRecord[]>([
    { studentId: '1', name: 'أحمد ياسين محمد إبراهيم', code: 'STD-2026-001', status: 'PRESENT' },
    { studentId: '2', name: 'مازن شريف عبد المنعم', code: 'STD-2026-002', status: 'PRESENT' },
    { studentId: '3', name: 'كريم خالد مصطفى السعيد', code: 'STD-2026-003', status: 'LATE', note: 'تأخر عن الطابور الصباحي' },
    { studentId: '4', name: 'نور الدين حسام حسن رضوان', code: 'STD-2026-004', status: 'PRESENT' },
    { studentId: '5', name: 'عمر طارق عبد الله خليل', code: 'STD-2026-005', status: 'ABSENT', note: 'إشعار مرسل للوالد' },
    { studentId: '6', name: 'ياسين مدحت سامي', code: 'STD-2026-006', status: 'EXCUSED', note: 'عذر مرضي معتمد' }
  ]);

  readonly presentCount = computed(() => this.records().filter(r => r.status === 'PRESENT').length);
  readonly absentCount = computed(() => this.records().filter(r => r.status === 'ABSENT').length);
  readonly lateCount = computed(() => this.records().filter(r => r.status === 'LATE').length);
  readonly excusedCount = computed(() => this.records().filter(r => r.status === 'EXCUSED').length);

  readonly attendanceRate = computed(() => {
    const total = this.records().length;
    if (total === 0) return 0;
    return Math.round((this.presentCount() / total) * 100);
  });

  setStatus(studentId: string, status: AttendanceStatus): void {
    this.records.update(list =>
      list.map(r => r.studentId === studentId ? { ...r, status } : r)
    );
  }

  markAllPresent(): void {
    this.records.update(list => list.map(r => ({ ...r, status: 'PRESENT' })));
  }

  saveAttendance(): void {
    alert('تم حفظ واعتماد سجل الحضور والغياب بنجاح وتوثيق إحصائيات اليوم.');
  }
}

