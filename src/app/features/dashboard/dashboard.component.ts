import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ArabicDatePipe } from '../../shared/pipes/arabic-date.pipe';
import { SCHOOL_INFO } from '../../core/constants/school.constants';
import { TermEndAlertComponent } from '../../shared/components/term-end-alert/term-end-alert.component';

interface StatMetric {
  title: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  iconBg: string;
  iconColor: string;
  // SVG path data, drawn in the template (no [innerHTML], so Angular keeps it)

  iconPaths: string[];
}

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'EXAM' | 'ATTENDANCE' | 'ASSIGNMENT' | 'ANNOUNCEMENT';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ArabicDatePipe, TermEndAlertComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  readonly authService = inject(AuthService);
  readonly school = SCHOOL_INFO;
  readonly today = new Date();

  readonly stats = signal<StatMetric[]>([
    {
      title: 'إجمالي الطلاب المقيدين',
      value: '1,420',
      change: '+4.2%',
      isPositive: true,
      iconBg: 'bg-blue-50',
      iconColor: 'text-primary-700',
      iconPaths: ['M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z']
    },
    {
      title: 'هيئة التدريس والمشرفين',
      value: '84',
      change: '+2 معلم',
      isPositive: true,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-700',
      iconPaths: ['M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2']
    },
    {
      title: 'نسبة الحضور اليومي',
      value: '96.8%',
      change: '+1.5%',
      isPositive: true,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-700',
      iconPaths: ['M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z']
    },
    {
      title: 'متوسط الأداء والتقييم',
      value: '89.4%',
      change: '+3.1%',
      isPositive: true,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-700',
      iconPaths: ['M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z']
    }
  ]);

  readonly todaySchedule = signal([
    {
      id: '1',
      periodNumber: '1',
      subject: 'اللغة الإنجليزية',
      teacher: 'مستر أحمد عبد السلام',
      className: 'فصل 1/1',
      time: '08:00 - 08:45 AM',
      status: 'جارية الآن',
      statusBadgeClass: 'bg-emerald-100 text-emerald-800'
    },
    {
      id: '2',
      periodNumber: '2',
      subject: 'الرياضيات',
      teacher: 'أ/ سامي نبيل',
      className: 'فصل 2/2',
      time: '08:50 - 09:35 AM',
      status: 'قادمة',
      statusBadgeClass: 'bg-slate-100 text-slate-700'
    },
    {
      id: '3',
      periodNumber: '3',
      subject: 'العلوم',
      teacher: 'د/ شريف فؤاد',
      className: 'فصل 3/1',
      time: '09:40 - 10:25 AM',
      status: 'قادمة',
      statusBadgeClass: 'bg-slate-100 text-slate-700'
    },
    {
      id: '4',
      periodNumber: '4',
      subject: 'اللغة العربية والتربية الإسلامية',
      teacher: 'الشيخ عبد الرحمن طه',
      className: 'فصل 1/2',
      time: '10:50 - 11:35 AM',
      status: 'قادمة',
      statusBadgeClass: 'bg-slate-100 text-slate-700'
    }
  ]);

  readonly activities = signal<ActivityItem[]>([
    {
      id: 'a1',
      title: 'إعلان جدول امتحانات نصف العام 2026/2027',
      description: 'تم اعتماد جدول امتحانات الفصل الدراسي الأول من قِبل إدارة المدرسة والكنترول.',
      time: 'منذ 15 دقيقة',
      type: 'ANNOUNCEMENT'
    },
    {
      id: 'a2',
      title: 'اكتمال حصر غياب الطابور الصباحي',
      description: 'تم توثيق حضور 96.8% من الطلاب في كافة المراحل التعليمية بنجاح.',
      time: 'منذ ساعة',
      type: 'ATTENDANCE'
    },
    {
      id: 'a3',
      title: 'طرح واجب العلوم',
      description: 'أضاف قسم العلوم واجباً لطلاب الصف الثاني الإعدادي.',
      time: 'منذ ساعتين',
      type: 'ASSIGNMENT'
    }
  ]);
}

