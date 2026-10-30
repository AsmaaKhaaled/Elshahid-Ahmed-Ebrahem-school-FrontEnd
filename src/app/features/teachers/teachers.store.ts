import { Injectable, computed, inject, signal } from '@angular/core';
import { AcademicCalendarStore } from '../../core/academic/academic-calendar.store';
import { DAILY_PERIODS, SCHOOL_DAYS } from '../../core/constants/school.constants';
import { Teacher, TermSchedules, WeeklySchedule, slotKey } from './teacher.model';

/**
 * Single source of truth for teachers & their weekly schedules,
 * shared by the teachers page and the classes page (class advisors).
 */
@Injectable({ providedIn: 'root' })
export class TeachersStore {
  private readonly calendar = inject(AcademicCalendarStore);

  readonly teachers = signal<Teacher[]>([
    {
      id: '1',
      name: 'محمود عبد العزيز الشناوي',
      nationalId: '27203151234567',
      title: 'كبير معلمين - رئيس قسم الرياضيات',
      specialization: 'الرياضيات',
      email: 'm.shinawy@school.edu.eg',
      phone: '01012340001',
      subjects: ['الرياضيات'],
      status: 'على رأس العمل'
    },
    {
      id: '2',
      name: 'نادية كمال الشربيني',
      nationalId: '28006221234568',
      title: 'معلم خبير لغة إنجليزية',
      specialization: 'اللغة الإنجليزية',
      email: 'nadia.sh@school.edu.eg',
      phone: '01122334455',
      subjects: ['اللغة الإنجليزية'],
      status: 'على رأس العمل'
    },
    {
      id: '3',
      name: 'شريف فؤاد عبد الهادي',
      nationalId: '28309101234569',
      title: 'معلم أول أ - علوم',
      specialization: 'العلوم',
      email: 'sherif.f@school.edu.eg',
      phone: '01234567890',
      subjects: ['العلوم'],
      status: 'على رأس العمل'
    },
    {
      id: '4',
      name: 'سامية نبيل عبد العليم',
      nationalId: '28511051234570',
      title: 'معلم أول رياضيات',
      specialization: 'الرياضيات',
      email: 'samia.nabil@school.edu.eg',
      phone: '01098765432',
      subjects: ['الرياضيات'],
      status: 'على رأس العمل'
    },
    {
      id: '5',
      name: 'عبد الرحمن طه إبراهيم',
      nationalId: '27801201234571',
      title: 'معلم خبير لغة عربية وتربية دينية',
      specialization: 'اللغة العربية',
      email: 'abdelrahman.t@school.edu.eg',
      phone: '01055566677',
      subjects: ['اللغة العربية', 'التربية الدينية الإسلامية'],
      status: 'على رأس العمل'
    },
    {
      id: '6',
      name: 'وليد منصور عبد الله',
      nationalId: '28704121234572',
      title: 'معلم لغة إنجليزية',
      specialization: 'اللغة الإنجليزية',
      email: '',
      phone: '01011223344',
      subjects: ['اللغة الإنجليزية'],
      status: 'إجازة اعتيادية'
    },
    {
      id: '7',
      name: 'حسن إبراهيم السيد',
      nationalId: '28102081234573',
      title: 'معلم أول دراسات اجتماعية',
      specialization: 'الدراسات الاجتماعية',
      email: '',
      phone: '01123456780',
      subjects: ['الدراسات الاجتماعية'],
      status: 'على رأس العمل'
    },
    {
      id: '8',
      name: 'أحمد مصطفى كامل',
      nationalId: '28408301234574',
      title: 'معلم لغة عربية',
      specialization: 'اللغة العربية',
      email: '',
      phone: '01234509876',
      subjects: ['اللغة العربية'],
      status: 'على رأس العمل'
    },
    {
      id: '9',
      name: 'طارق عبد الحميد فرج',
      nationalId: '27911151234575',
      title: 'معلم خبير علوم',
      specialization: 'العلوم',
      email: '',
      phone: '01099887711',
      subjects: ['العلوم'],
      status: 'على رأس العمل'
    },
    {
      id: '10',
      name: 'خالد سعيد عبد الفتاح',
      nationalId: '28603251234576',
      title: 'معلم دراسات اجتماعية',
      specialization: 'الدراسات الاجتماعية',
      email: '',
      phone: '01511223344',
      subjects: ['الدراسات الاجتماعية'],
      status: 'على رأس العمل'
    },
    {
      id: '11',
      name: 'ياسر عادل محمود',
      nationalId: '28212011234577',
      title: 'معلم أول لغة عربية',
      specialization: 'اللغة العربية',
      email: '',
      phone: '01066778899',
      subjects: ['اللغة العربية'],
      status: 'على رأس العمل'
    },
    {
      id: '12',
      name: 'إبراهيم سالم حسين',
      nationalId: '28807071234578',
      title: 'معلم رياضيات',
      specialization: 'الرياضيات',
      email: '',
      phone: '01155667788',
      subjects: ['الرياضيات'],
      status: 'على رأس العمل'
    }
  ]);

  readonly schedules = signal<TermSchedules>({
    // Demo schedules for the first term of 2026/2027
    '2026-2027-T1': seedSchedules([
      { teacherId: '1', subject: 'الرياضيات', sections: ['3/1', '3/2', '3/3', '3/4'], perWeek: 5 },
      { teacherId: '2', subject: 'اللغة الإنجليزية', sections: ['2/1', '2/2', '2/3', '2/4', '3/1'], perWeek: 4 },
      { teacherId: '3', subject: 'العلوم', sections: ['1/1', '1/2', '1/3', '2/1', '2/2', '2/3'], perWeek: 3 },
      { teacherId: '4', subject: 'الرياضيات', sections: ['1/1', '1/2', '1/3', '1/4', '2/1'], perWeek: 4 },
      { teacherId: '5', subject: 'اللغة العربية', sections: ['1/1', '1/2', '1/3', '1/4'], perWeek: 5 },
      { teacherId: '6', subject: 'اللغة الإنجليزية', sections: ['1/1', '1/2', '1/3', '1/4'], perWeek: 4 },
      { teacherId: '7', subject: 'الدراسات الاجتماعية', sections: ['1/1', '1/2', '1/3', '1/4', '2/1', '2/2'], perWeek: 3 },
      { teacherId: '8', subject: 'اللغة العربية', sections: ['2/1', '2/2', '2/3', '2/4'], perWeek: 5 },
      { teacherId: '9', subject: 'العلوم', sections: ['2/4', '3/1', '3/2', '3/3', '3/4'], perWeek: 4 },
      { teacherId: '10', subject: 'الدراسات الاجتماعية', sections: ['2/3', '2/4', '3/1', '3/2', '3/3', '3/4'], perWeek: 3 },
      { teacherId: '11', subject: 'اللغة العربية', sections: ['3/1', '3/2', '3/3', '3/4'], perWeek: 5 },
      { teacherId: '12', subject: 'الرياضيات', sections: ['2/2', '2/3', '2/4'], perWeek: 5 }
    ])
  });

  // Weekly periods & distinct sections per teacher for the current term
  readonly currentTermLoad = computed(() => {
    const termSchedules = this.schedules()[this.calendar.currentTermId()] ?? {};
    const result: Record<string, { periods: number; sections: number }> = {};
    for (const [teacherId, schedule] of Object.entries(termSchedules)) {
      const slots = Object.values(schedule);
      result[teacherId] = { periods: slots.length, sections: new Set(slots.map(slot => slot.section)).size };
    }
    return result;
  });

  saveTeacher(teacher: Teacher): void {
    this.teachers.update(list =>
      list.some(t => t.id === teacher.id)
        ? list.map(t => (t.id === teacher.id ? teacher : t))
        : [...list, teacher]
    );
  }

  deleteTeacher(teacherId: string): void {
    this.teachers.update(list => list.filter(t => t.id !== teacherId));
    this.schedules.update(all => {
      const next: TermSchedules = {};
      for (const [termId, termSchedules] of Object.entries(all)) {
        const { [teacherId]: _removed, ...rest } = termSchedules;
        next[termId] = rest;
      }
      return next;
    });
  }

  saveSchedule(teacherId: string, termId: string, schedule: WeeklySchedule): void {
    this.schedules.update(all => ({
      ...all,
      [termId]: { ...all[termId], [teacherId]: schedule }
    }));
  }
}

interface SeedPlan {
  teacherId: string;
  subject: string;
  sections: string[];
  perWeek: number;
}

// Builds conflict-free demo schedules, spreading each section's periods across the week
function seedSchedules(plans: SeedPlan[]): Record<string, WeeklySchedule> {
  const keys: string[] = [];
  for (let period = 0; period < DAILY_PERIODS; period++) {
    for (let day = 0; day < SCHOOL_DAYS.length; day++) {
      keys.push(slotKey(day, period));
    }
  }

  const takenSections = new Set<string>();
  const result: Record<string, WeeklySchedule> = {};

  plans.forEach((plan, planIndex) => {
    const schedule: WeeklySchedule = {};
    let cursor = planIndex * 3;

    for (const section of plan.sections) {
      for (let n = 0; n < plan.perWeek; n++) {
        for (let tries = 0; tries < keys.length; tries++) {
          const key = keys[(cursor + tries) % keys.length];
          if (!schedule[key] && !takenSections.has(`${key}|${section}`)) {
            schedule[key] = { subject: plan.subject, section };
            takenSections.add(`${key}|${section}`);
            cursor += tries + 1;
            break;
          }
        }
      }
    }
    result[plan.teacherId] = schedule;
  });

  return result;
}
