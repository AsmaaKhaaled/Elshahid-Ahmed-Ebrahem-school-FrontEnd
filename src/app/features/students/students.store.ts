import { Injectable, computed, signal, inject } from '@angular/core';
import { Student } from './student.model';
import { StudentsService } from '../../core/services/students.service';

/**
 * Single source of truth for enrolled students.
 * Integrates with Backend StudentsService and maintains responsive local state.
 */
@Injectable({ providedIn: 'root' })
export class StudentsStore {
  private readonly studentsService = inject(StudentsService);

  readonly students = signal<Student[]>([
    {
      id: '1',
      code: 'STD-2026-001',
      nationalId: '31001011234567',
      name: 'أحمد ياسين محمد إبراهيم',
      gradeId: 'G1',
      className: '1/3',
      guardianName: 'المهندس / ياسين محمد',
      guardianPhone: '01001234567',
      status: 'منتظم',
      gpa: 98.4
    },
    {
      id: '2',
      code: 'STD-2026-002',
      nationalId: '31002021234568',
      name: 'مازن شريف عبد المنعم',
      gradeId: 'G1',
      className: '1/1',
      guardianName: 'دكتور / شريف عبد المنعم',
      guardianPhone: '01112345678',
      status: 'منتظم',
      gpa: 96.2
    },
    {
      id: '3',
      code: 'STD-2026-003',
      nationalId: '31003031234569',
      name: 'كريم خالد مصطفى السعيد',
      gradeId: 'G2',
      className: '2/1',
      guardianName: 'أ/ خالد مصطفى',
      guardianPhone: '01223456789',
      status: 'منتظم',
      gpa: 91.5
    },
    {
      id: '4',
      code: 'STD-2026-004',
      nationalId: '31004041234570',
      name: 'نور الدين حسام حسن رضوان',
      gradeId: 'G3',
      className: '3/2',
      guardianName: 'المحامي / حسام حسن',
      guardianPhone: '01556789012',
      status: 'منتظم',
      gpa: 94.0
    },
    {
      id: '5',
      code: 'STD-2026-005',
      nationalId: '31005051234571',
      name: 'عمر طارق عبد الله خليل',
      gradeId: 'G3',
      className: '3/3',
      guardianName: 'أ/ طارق عبد الله',
      guardianPhone: '01099887766',
      status: 'منتظم',
      gpa: 87.8
    }
  ]);

  readonly metrics = computed(() => {
    const list = this.students();
    return {
      total: list.length,
      regular: list.filter(s => s.status === 'منتظم').length,
      honor: list.filter(s => s.gpa !== null && s.gpa >= 90).length,
      inactive: list.filter(s => s.status !== 'منتظم').length
    };
  });

  loadFromApi(): void {
    this.studentsService.getAll().subscribe({
      next: (res) => {
        const rawList = res?.data || (Array.isArray(res) ? res : []);
        if (Array.isArray(rawList) && rawList.length > 0) {
          const mapped: Student[] = rawList.map((s: any) => ({
            id: s.id,
            code: s.studentCode || s.code,
            nationalId: s.nationalId,
            name: s.fullNameArabic || s.name,
            gradeId: s.gradeLevel?.includes('الأول') ? 'G1' : s.gradeLevel?.includes('الثاني') ? 'G2' : 'G3',
            className: s.class?.name || s.className || '1/1',
            guardianName: s.guardianName || '',
            guardianPhone: s.guardianPhone || '',
            status: (s.enrollmentStatus || s.status || 'منتظم') as any,
            gpa: s.gpa ?? null
          }));

          this.students.update(current => {
            const list = [...current];
            mapped.forEach(dbStudent => {
              const idx = list.findIndex(s => s.code === dbStudent.code || s.nationalId === dbStudent.nationalId || s.id === dbStudent.id);
              if (idx >= 0) {
                list[idx] = { ...list[idx], ...dbStudent };
              } else {
                list.push(dbStudent);
              }
            });
            return list;
          });
        }
      },
      error: () => {
        // Fallback: keep current list
      }
    });
  }

  saveStudent(student: Student): void {
    this.students.update(list => {
      const exists = list.some(s => s.id === student.id || s.code === student.code || (student.nationalId && s.nationalId === student.nationalId));
      if (exists) {
        return list.map(s => (s.id === student.id || s.code === student.code || (student.nationalId && s.nationalId === student.nationalId) ? student : s));
      }
      return [student, ...list];
    });
  }

  addStudents(students: Student[]): void {
    this.students.update(list => [...list, ...students]);
  }

  deleteStudent(studentId: string): void {
    this.students.update(list => list.filter(s => s.id !== studentId));
  }
}
