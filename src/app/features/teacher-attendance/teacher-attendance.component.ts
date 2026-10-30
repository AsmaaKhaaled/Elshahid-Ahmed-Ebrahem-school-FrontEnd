import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ArabicDatePipe } from '../../shared/pipes/arabic-date.pipe';
import { SCHOOL_INFO } from '../../core/constants/school.constants';

type TeacherAttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'CASUAL_LEAVE' | 'SICK_LEAVE' | 'MISSION';

interface TeacherAttendanceRecord {
  teacherId: string;
  name: string;
  specialization: string;
  status: TeacherAttendanceStatus;
  arrivalTime: string;
  departureTime: string;
  note?: string;
}

interface StatusOption {
  value: TeacherAttendanceStatus;
  label: string;
  activeClass: string;
}

@Component({
  selector: 'app-teacher-attendance',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ArabicDatePipe],
  templateUrl: './teacher-attendance.component.html',
  styleUrl: './teacher-attendance.component.css'
})
export class TeacherAttendanceComponent {
  readonly school = SCHOOL_INFO;
  readonly today = new Date();
  readonly selectedDate = signal<string>(new Date().toISOString().slice(0, 10));

  readonly statusOptions: StatusOption[] = [
    { value: 'PRESENT', label: 'حاضر', activeClass: 'bg-emerald-600' },
    { value: 'LATE', label: 'متأخر', activeClass: 'bg-amber-500' },
    { value: 'ABSENT', label: 'غائب', activeClass: 'bg-rose-600' },
    { value: 'CASUAL_LEAVE', label: 'عارضة', activeClass: 'bg-blue-600' },
    { value: 'SICK_LEAVE', label: 'مرضي', activeClass: 'bg-indigo-600' },
    { value: 'MISSION', label: 'مأمورية', activeClass: 'bg-slate-600' }
  ];

  readonly records = signal<TeacherAttendanceRecord[]>([
    { teacherId: '1', name: 'أ. محمود عبد العزيز الشناوي', specialization: 'الرياضيات', status: 'PRESENT', arrivalTime: '07:30', departureTime: '14:00' },
    { teacherId: '2', name: 'أ. كمال محمد الشربيني', specialization: 'اللغة الإنجليزية', status: 'PRESENT', arrivalTime: '07:25', departureTime: '14:00' },
    { teacherId: '3', name: 'أ. شريف فؤاد عبد الهادي', specialization: 'العلوم', status: 'LATE', arrivalTime: '08:10', departureTime: '14:00', note: 'تأخير 40 دقيقة' },
    { teacherId: '4', name: 'أ. سامي نبيل عبد العليم', specialization: 'الرياضيات', status: 'PRESENT', arrivalTime: '07:30', departureTime: '14:00' },
    { teacherId: '5', name: 'الشيخ عبد الرحمن طه إبراهيم', specialization: 'اللغة العربية والتربية الدينية', status: 'PRESENT', arrivalTime: '07:20', departureTime: '14:00' },
    { teacherId: '6', name: 'أ. حسن إبراهيم السيد', specialization: 'الدراسات الاجتماعية', status: 'CASUAL_LEAVE', arrivalTime: '', departureTime: '', note: 'إجازة عارضة' },
    { teacherId: '7', name: 'أ. أحمد مصطفى عبد الله', specialization: 'التربية الرياضية', status: 'PRESENT', arrivalTime: '07:30', departureTime: '14:00' },
    { teacherId: '8', name: 'أ. خالد سعيد محمود', specialization: 'الحاسب الآلي', status: 'MISSION', arrivalTime: '', departureTime: '', note: 'مأمورية بالإدارة التعليمية' },
    { teacherId: '9', name: 'أ. ياسر عادل فهمي', specialization: 'التربية الفنية', status: 'ABSENT', arrivalTime: '', departureTime: '' }
  ]);

  readonly attendanceRate = computed(() => {
    const total = this.records().length;
    if (total === 0) return 0;
    const onSite = this.records().filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
    return Math.round((onSite / total) * 100);
  });

  countOf(status: TeacherAttendanceStatus): number {
    return this.records().filter(r => r.status === status).length;
  }

  isOnDuty(status: TeacherAttendanceStatus): boolean {
    return status === 'PRESENT' || status === 'LATE';
  }

  setStatus(teacherId: string, status: TeacherAttendanceStatus): void {
    this.records.update(list =>
      list.map(r => {
        if (r.teacherId !== teacherId) return r;
        return this.isOnDuty(status)
          ? { ...r, status, arrivalTime: r.arrivalTime || '07:30', departureTime: r.departureTime || '14:00' }
          : { ...r, status, arrivalTime: '', departureTime: '' };
      })
    );
  }

  markAllPresent(): void {
    this.records.update(list =>
      list.map(r => ({ ...r, status: 'PRESENT', arrivalTime: r.arrivalTime || '07:30', departureTime: r.departureTime || '14:00' }))
    );
  }

  saveAttendance(): void {
    alert('تم حفظ واعتماد دفتر حضور وغياب المعلمين بنجاح.');
  }
}
