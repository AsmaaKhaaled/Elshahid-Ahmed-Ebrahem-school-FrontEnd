import { Injectable, computed, inject, signal } from '@angular/core';
import { TeachingScope } from '../teaching/teaching-scope.service';
import { Curriculum, CurriculumFile, CurriculumUnit } from './curriculum.model';

const HOUR = 3600000;
const DAY = 24 * HOUR;
const MB = 1024 * 1024;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

const lesson = (id: string, title: string, week: number | null, doneDaysAgo: number | null = null) =>
  ({ id, title, week, doneAt: doneDaysAgo === null ? null : ago(doneDaysAgo * DAY) });

/**
 * Each teacher keeps the ministry curriculum of the subjects they teach: its units & lessons
 * (with what was taught so far) and the official files they upload (textbook, plan, sample exams...).
 * Students see the curriculum of their own class. Mock data until the backend stores it.
 */
@Injectable({ providedIn: 'root' })
export class CurriculumStore {
  private readonly scope = inject(TeachingScope);

  readonly curricula = signal<Curriculum[]>([
    {
      id: 'cur-1', teacherId: '1', subject: 'الرياضيات', gradeId: 'G3', sections: ['3/2', '3/3'],
      description: 'منهج الرياضيات للصف الثالث الإعدادي - الفصل الدراسي الأول (جبر وهندسة).',
      updatedAt: ago(3 * HOUR),
      units: [
        {
          id: 'u-1-1', title: 'الوحدة الأولى: المعادلات',
          lessons: [
            lesson('l-1-1', 'حل معادلتين من الدرجة الأولى في متغيرين جبرياً', 1, 12),
            lesson('l-1-2', 'حل معادلتين من الدرجة الأولى في متغيرين بيانياً', 2, 6),
            lesson('l-1-3', 'حل معادلة من الدرجة الثانية في متغير واحد', 3, 1),
            lesson('l-1-4', 'تطبيقات على حل المعادلات', 4)
          ]
        },
        {
          id: 'u-1-2', title: 'الوحدة الثانية: حساب المثلثات',
          lessons: [
            lesson('l-1-5', 'النسب المثلثية الأساسية للزاوية الحادة', 5),
            lesson('l-1-6', 'النسب المثلثية لبعض الزوايا الخاصة', 6),
            lesson('l-1-7', 'البعد بين نقطتين ونقطة المنتصف', 7)
          ]
        }
      ],
      files: [
        { id: 'cf-1', kind: 'book', title: 'كتاب الرياضيات - الترم الأول', file: { name: 'كتاب-الرياضيات-3ع-ت1.pdf', size: 14.2 * MB, url: '' }, forStudents: true, uploadedAt: ago(20 * DAY) },
        { id: 'cf-2', kind: 'plan', title: 'توزيع منهج الرياضيات على الأسابيع', file: { name: 'توزيع-المنهج-رياضيات.pdf', size: 0.3 * MB, url: '' }, forStudents: true, uploadedAt: ago(20 * DAY) },
        { id: 'cf-3', kind: 'guide', title: 'دليل المعلم', file: { name: 'دليل-معلم-الرياضيات.pdf', size: 6.8 * MB, url: '' }, forStudents: false, uploadedAt: ago(19 * DAY) },
        { id: 'cf-4', kind: 'exams', title: 'نماذج امتحانات الوزارة 2025', file: { name: 'نماذج-الوزارة-2025.pdf', size: 1.9 * MB, url: '' }, forStudents: true, uploadedAt: ago(4 * HOUR) }
      ]
    },
    {
      id: 'cur-2', teacherId: '2', subject: 'اللغة الإنجليزية', gradeId: 'G2', sections: ['2/1'],
      description: 'Hello! 2 - Term 1', updatedAt: ago(2 * DAY),
      units: [
        { id: 'u-2-1', title: 'Unit 1: Holidays', lessons: [lesson('l-2-1', 'Lesson 1-2', 1, 20), lesson('l-2-2', 'Lesson 3-4', 2, 13)] },
        { id: 'u-2-2', title: 'Unit 2: Sports', lessons: [lesson('l-2-3', 'Lesson 1-2', 3, 6), lesson('l-2-4', 'Lesson 3-4', 4)] },
        { id: 'u-2-3', title: 'Unit 3: Healthy Food', lessons: [lesson('l-2-5', 'Lesson 1-2', 5)] }
      ],
      files: [
        { id: 'cf-5', kind: 'book', title: 'Student Book', file: { name: 'Hello2-StudentBook.pdf', size: 11.4 * MB, url: '' }, forStudents: true, uploadedAt: ago(25 * DAY) }
      ]
    },
    {
      id: 'cur-3', teacherId: '3', subject: 'العلوم', gradeId: 'G1', sections: ['1/1'],
      description: '', updatedAt: ago(1 * DAY),
      units: [
        {
          id: 'u-3-1', title: 'الوحدة الأولى: تركيب المادة',
          lessons: [lesson('l-3-1', 'المادة وخواصها', 1, 15), lesson('l-3-2', 'تركيب المادة', 2, 8), lesson('l-3-3', 'الخلية: وحدة بناء الكائن الحي', 3)]
        }
      ],
      files: []
    }
  ]);

  // ---- What the signed-in user sees: a teacher their own curricula, a student their class's ----

  readonly visible = computed(() => {
    const list = this.curricula();
    if (this.scope.isTeacher()) return list.filter(c => c.teacherId === this.scope.teacherId());
    if (this.scope.isStudent()) {
      // Students don't get the teacher-only references
      return list
        .filter(c => c.sections.includes(this.scope.studentSection()))
        .map(c => ({ ...c, files: c.files.filter(f => f.forStudents) }));
    }
    return list;
  });

  /** Lessons of the signed-in teacher's curricula for a subject (to link a material to a lesson). */
  lessonsFor(subject: string): { id: string; title: string; unit: string }[] {
    return this.visible()
      .filter(c => c.subject === subject)
      .flatMap(c => c.units.flatMap(unit => unit.lessons.map(l => ({ id: l.id, title: l.title, unit: unit.title }))));
  }

  save(curriculum: Curriculum): void {
    this.curricula.update(list => [{ ...curriculum, updatedAt: new Date().toISOString() }, ...list.filter(c => c.id !== curriculum.id)]);
  }

  delete(id: string): void {
    this.curricula.update(list => list.filter(c => c.id !== id));
  }

  saveUnit(curriculumId: string, unit: CurriculumUnit): void {
    this.patch(curriculumId, c => {
      const exists = c.units.some(u => u.id === unit.id);
      return { ...c, units: exists ? c.units.map(u => (u.id === unit.id ? unit : u)) : [...c.units, unit] };
    });
  }

  deleteUnit(curriculumId: string, unitId: string): void {
    this.patch(curriculumId, c => ({ ...c, units: c.units.filter(u => u.id !== unitId) }));
  }

  /** Marks a lesson as taught (or not yet). */
  toggleLesson(curriculumId: string, lessonId: string): void {
    this.patch(curriculumId, c => ({
      ...c,
      units: c.units.map(u => ({
        ...u,
        lessons: u.lessons.map(l => (l.id === lessonId ? { ...l, doneAt: l.doneAt ? null : new Date().toISOString() } : l))
      }))
    }));
  }

  addFile(curriculumId: string, file: CurriculumFile): void {
    this.patch(curriculumId, c => ({ ...c, files: [file, ...c.files] }));
  }

  deleteFile(curriculumId: string, fileId: string): void {
    this.patch(curriculumId, c => ({ ...c, files: c.files.filter(f => f.id !== fileId) }));
  }

  private patch(id: string, change: (curriculum: Curriculum) => Curriculum): void {
    this.curricula.update(list => list.map(c => (c.id === id ? { ...change(c), updatedAt: new Date().toISOString() } : c)));
  }
}
