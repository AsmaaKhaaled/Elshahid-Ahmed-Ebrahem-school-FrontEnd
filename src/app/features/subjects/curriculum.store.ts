import { Injectable, computed, inject, signal } from '@angular/core';
import { TeachingScope } from '../teaching/teaching-scope.service';
import { Curriculum, CurriculumFile } from './curriculum.model';

const HOUR = 3600000;
const DAY = 24 * HOUR;
const MB = 1024 * 1024;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

/**
 * Each teacher uploads the ministry curriculum of the subjects they teach: the official files
 * (textbook, plan, sample exams...) or links to them. Students see the curriculum of their own class.
 * Mock data until the backend stores it.
 */
@Injectable({ providedIn: 'root' })
export class CurriculumStore {
  private readonly scope = inject(TeachingScope);

  readonly curricula = signal<Curriculum[]>([
    {
      id: 'cur-1', teacherId: '1', subject: 'الرياضيات', gradeId: 'G3', sections: ['3/2', '3/3'],
      description: 'منهج الرياضيات للصف الثالث الإعدادي - الفصل الدراسي الأول (جبر وهندسة).',
      updatedAt: ago(3 * HOUR),
      files: [
        { id: 'cf-1', kind: 'book', title: 'كتاب الرياضيات - الترم الأول', file: { name: 'كتاب-الرياضيات-3ع-ت1.pdf', size: 14.2 * MB, url: '' }, forStudents: true, uploadedAt: ago(20 * DAY) },
        { id: 'cf-2', kind: 'plan', title: 'توزيع منهج الرياضيات على الأسابيع', file: { name: 'توزيع-المنهج-رياضيات.pdf', size: 0.3 * MB, url: '' }, forStudents: true, uploadedAt: ago(20 * DAY) },
        { id: 'cf-3', kind: 'guide', title: 'دليل المعلم', file: { name: 'دليل-معلم-الرياضيات.pdf', size: 6.8 * MB, url: '' }, forStudents: false, uploadedAt: ago(19 * DAY) },
        { id: 'cf-4', kind: 'exams', title: 'نماذج امتحانات الوزارة 2025', file: { name: 'نماذج-الوزارة-2025.pdf', size: 1.9 * MB, url: '' }, forStudents: true, uploadedAt: ago(4 * HOUR) },
        { id: 'cf-6', kind: 'other', title: 'بنك المعرفة - الرياضيات للصف الثالث', link: 'https://www.ekb.eg/', forStudents: true, uploadedAt: ago(2 * DAY) }
      ],
      plan: [
        {
          id: 'p-1-1', week: 1, topic: 'حل معادلتين من الدرجة الأولى في متغيرين جبرياً',
          objectives: ['يحل الطالب معادلتين بطريقة الحذف', 'يحل الطالب معادلتين بطريقة التعويض', 'يتحقق من صحة الحل']
        },
        {
          id: 'p-1-2', week: 2, topic: 'حل معادلتين من الدرجة الأولى في متغيرين بيانياً',
          objectives: ['يمثل المعادلة بيانياً', 'يستنتج الحل من نقطة التقاطع']
        },
        {
          id: 'p-1-3', week: 3, topic: 'حل معادلة من الدرجة الثانية في متغير واحد',
          objectives: ['يحل المعادلة بالتحليل', 'يستخدم القانون العام']
        }
      ],
      planFile: { name: 'خطة-منهج-الرياضيات-3ع.docx', size: 0.2 * MB, url: '' }
    },
    {
      id: 'cur-2', teacherId: '2', subject: 'اللغة الإنجليزية', gradeId: 'G2', sections: ['2/1'],
      description: 'Hello! 2 - Term 1', updatedAt: ago(2 * DAY),
      files: [
        { id: 'cf-5', kind: 'book', title: 'Student Book', file: { name: 'Hello2-StudentBook.pdf', size: 11.4 * MB, url: '' }, forStudents: true, uploadedAt: ago(25 * DAY) }
      ],
      plan: []
    },
    {
      id: 'cur-3', teacherId: '3', subject: 'العلوم', gradeId: 'G1', sections: ['1/1'],
      description: '', updatedAt: ago(1 * DAY),
      files: [],
      plan: []
    }
  ]);

  // ---- What the signed-in user sees: a teacher their own curricula, a student their class's ----

  readonly visible = computed(() => {
    const list = this.curricula();
    if (this.scope.isTeacher()) return list.filter(c => c.teacherId === this.scope.teacherId());
    if (this.scope.isStudent()) {
      // Students don't get the teacher-only references, nor the plan & objectives
      return list
        .filter(c => c.sections.includes(this.scope.studentSection()))
        .map(c => ({ ...c, files: c.files.filter(f => f.forStudents), plan: [], planFile: undefined }));
    }
    return list;
  });

  save(curriculum: Curriculum): void {
    this.curricula.update(list => [{ ...curriculum, updatedAt: new Date().toISOString() }, ...list.filter(c => c.id !== curriculum.id)]);
  }

  delete(id: string): void {
    this.curricula.update(list => list.filter(c => c.id !== id));
  }

  addFile(curriculumId: string, file: CurriculumFile): void {
    this.patch(curriculumId, c => ({ ...c, files: [file, ...c.files] }));
  }

  savePlan(curriculumId: string, plan: Curriculum['plan'], planFile: Curriculum['planFile']): void {
    this.patch(curriculumId, c => ({ ...c, plan, planFile }));
  }

  deleteFile(curriculumId: string, fileId: string): void {
    this.patch(curriculumId, c => ({ ...c, files: c.files.filter(f => f.id !== fileId) }));
  }

  private patch(id: string, change: (curriculum: Curriculum) => Curriculum): void {
    this.curricula.update(list => list.map(c => (c.id === id ? { ...change(c), updatedAt: new Date().toISOString() } : c)));
  }
}
