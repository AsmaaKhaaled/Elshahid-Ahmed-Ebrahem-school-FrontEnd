import { Injectable, computed, signal } from '@angular/core';
import { Student } from './student.model';

/**
 * Single source of truth for enrolled students.
 * Local state for now - each method maps to a backend endpoint once the API is ready.
 */
@Injectable({ providedIn: 'root' })
export class StudentsStore {
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

  saveStudent(student: Student): void {
    this.students.update(list =>
      list.some(s => s.id === student.id)
        ? list.map(s => (s.id === student.id ? student : s))
        : [...list, student]
    );
  }

  // Bulk enrolment from the Excel import (POST /students/bulk on the backend)
  addStudents(students: Student[]): void {
    this.students.update(list => [...list, ...students]);
  }

  deleteStudent(studentId: string): void {
    this.students.update(list => list.filter(s => s.id !== studentId));
  }
}
