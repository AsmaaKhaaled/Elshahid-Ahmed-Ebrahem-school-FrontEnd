import { ChangeDetectionStrategy, Component, signal, computed, linkedSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { GRADE_LEVELS } from '../../core/constants/school.constants';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';

interface Student {
  id: string;
  code: string;
  nationalId: string;
  name: string;
  gradeLevel: string;
  className: string;
  guardianName: string;
  guardianPhone: string;
  status: 'منتظم' | 'موقوف' | 'منقول';
  gpa: number;
}

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, PortalToBodyDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './students.component.html',
  styleUrl: './students.component.css'
})
export class StudentsComponent {
  readonly searchQuery = signal<string>('');
  readonly selectedGrade = signal<string>('ALL');
  readonly selectedStatus = signal<string>('ALL');
  readonly showAddModal = signal<boolean>(false);

  readonly grades = GRADE_LEVELS;
  readonly studentStatuses: Student['status'][] = ['منتظم', 'موقوف', 'منقول'];

  readonly newStudentGradeId = signal<string>(GRADE_LEVELS[0].id);
  readonly newStudentSections = computed(() =>
    GRADE_LEVELS.find(grade => grade.id === this.newStudentGradeId())?.sections ?? []
  );
  // Resets to the first section of the newly selected grade whenever the grade changes
  readonly newStudentSection = linkedSignal(() => this.newStudentSections()[0]);

  readonly students = signal<Student[]>([
    {
      id: '1',
      code: 'STD-2026-001',
      nationalId: '31001011234567',
      name: 'أحمد ياسين محمد إبراهيم',
      gradeLevel: 'الصف الأول الإعدادي',
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
      gradeLevel: 'الصف الأول الإعدادي',
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
      gradeLevel: 'الصف الثاني الإعدادي',
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
      gradeLevel: 'الصف الثالث الإعدادي',
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
      gradeLevel: 'الصف الثالث الإعدادي',
      className: '3/3',
      guardianName: 'أ/ طارق عبد الله',
      guardianPhone: '01099887766',
      status: 'منتظم',
      gpa: 87.8
    }
  ]);

  readonly filteredStudents = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const grade = this.selectedGrade();
    const status = this.selectedStatus();

    return this.students().filter(s => {
      const matchSearch = !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.nationalId.includes(q);
      const matchGrade = grade === 'ALL' || s.gradeLevel === grade;
      const matchStatus = status === 'ALL' || s.status === status;
      return matchSearch && matchGrade && matchStatus;
    });
  });

  toggleAddModal(): void {
    this.showAddModal.update(v => !v);
  }
}

