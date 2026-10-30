import { Injectable, signal } from '@angular/core';

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  teacherId: string;
  section: string;
  publishedAt: string;
  dueDate: string;
  attachments: number;
  totalSubmissions: number;
  totalStudents: number;
}

export type AssignmentStatus = 'نشط ومتاح' | 'انتهى الموعد';

export function assignmentStatus(assignment: Assignment): AssignmentStatus {
  return new Date(assignment.dueDate).getTime() < Date.now() ? 'انتهى الموعد' : 'نشط ومتاح';
}

export function submissionRate(assignment: Assignment): number {
  return assignment.totalStudents ? assignment.totalSubmissions / assignment.totalStudents : 0;
}

const HOUR = 3600000;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const ahead = (ms: number) => new Date(Date.now() + ms).toISOString();

/** Assignments published by teachers. Admins only monitor them; teachers publish. */
@Injectable({ providedIn: 'root' })
export class AssignmentsStore {
  readonly assignments = signal<Assignment[]>([
    {
      id: 'as-1', title: 'تمارين على المعادلات من الدرجة الأولى', subject: 'الرياضيات', teacherId: '1', section: '3/2',
      publishedAt: ago(2 * HOUR), dueDate: ahead(3 * DAY), attachments: 1, totalSubmissions: 12, totalStudents: 43
    },
    {
      id: 'as-2', title: 'Unit 3 Reading Comprehension', subject: 'اللغة الإنجليزية', teacherId: '2', section: '2/1',
      publishedAt: ago(5 * HOUR), dueDate: ahead(2 * DAY), attachments: 2, totalSubmissions: 30, totalStudents: 43
    },
    {
      id: 'as-3', title: 'تقرير عن مكونات الخلية', subject: 'العلوم', teacherId: '3', section: '1/1',
      publishedAt: ago(1 * DAY), dueDate: ahead(4 * DAY), attachments: 1, totalSubmissions: 25, totalStudents: 42
    },
    {
      id: 'as-4', title: 'حل تمارين الكسور العشرية', subject: 'الرياضيات', teacherId: '4', section: '1/3',
      publishedAt: ago(2 * DAY), dueDate: ago(6 * HOUR), attachments: 0, totalSubmissions: 38, totalStudents: 40
    },
    {
      id: 'as-5', title: 'إعراب الجمل الاسمية والفعلية', subject: 'اللغة العربية', teacherId: '5', section: '1/2',
      publishedAt: ago(3 * DAY), dueDate: ahead(1 * DAY), attachments: 1, totalSubmissions: 18, totalStudents: 41
    },
    {
      id: 'as-6', title: 'خريطة صماء لمحافظات مصر', subject: 'الدراسات الاجتماعية', teacherId: '7', section: '2/2',
      publishedAt: ago(4 * DAY), dueDate: ago(1 * DAY), attachments: 1, totalSubmissions: 21, totalStudents: 42
    },
    {
      id: 'as-7', title: 'تعبير: يوم في حياة طالب', subject: 'اللغة العربية', teacherId: '8', section: '2/3',
      publishedAt: ago(6 * DAY), dueDate: ago(2 * DAY), attachments: 0, totalSubmissions: 36, totalStudents: 40
    },
    {
      id: 'as-8', title: 'أسئلة على الطاقة وتحولاتها', subject: 'العلوم', teacherId: '9', section: '3/1',
      publishedAt: ago(30 * 60000), dueDate: ahead(5 * DAY), attachments: 2, totalSubmissions: 3, totalStudents: 44
    }
  ]);
}
