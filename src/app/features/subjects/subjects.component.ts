import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

interface SubjectItem {
  id: string;
  nameArabic: string;
  nameEnglish: string;
  code: string;
  gradeLevel: string;
  weeklyHours: number;
  type: 'منهج لغات متقدم' | 'منهج وزاري موحد' | 'لغة أجنبية ثانية';
  totalMarks: number;
}

@Component({
  selector: 'app-subjects',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './subjects.component.html',
  styleUrl: './subjects.component.css'
})
export class SubjectsComponent {
  readonly subjects = signal<SubjectItem[]>([
    {
      id: 'sub-1',
      nameArabic: 'اللغة الإنجليزية الرفيعة',
      nameEnglish: 'Advanced English (High Level)',
      code: 'ENG-101',
      gradeLevel: 'الصف الأول الإعدادي',
      weeklyHours: 6,
      type: 'منهج لغات متقدم',
      totalMarks: 100
    },
    {
      id: 'sub-2',
      nameArabic: 'الرياضيات باللغة الإنجليزية',
      nameEnglish: 'Pure & Applied Mathematics',
      code: 'MTH-101',
      gradeLevel: 'الصف الأول الإعدادي',
      weeklyHours: 5,
      type: 'منهج لغات متقدم',
      totalMarks: 100
    },
    {
      id: 'sub-3',
      nameArabic: 'الكيمياء والفيزياء (لغات)',
      nameEnglish: 'Integrated Sciences & Chemistry',
      code: 'SCI-101',
      gradeLevel: 'الصف الأول الإعدادي',
      weeklyHours: 5,
      type: 'منهج لغات متقدم',
      totalMarks: 100
    },
    {
      id: 'sub-4',
      nameArabic: 'اللغة العربية والخط والإملاء',
      nameEnglish: 'Arabic Language & Literature',
      code: 'ARB-101',
      gradeLevel: 'الصف الأول الإعدادي',
      weeklyHours: 4,
      type: 'منهج وزاري موحد',
      totalMarks: 80
    },
    {
      id: 'sub-5',
      nameArabic: 'اللغة الفرنسية (لغة أجنبية ثانية)',
      nameEnglish: 'French Language (Deuxième Langue)',
      code: 'FRN-101',
      gradeLevel: 'الصف الأول الإعدادي',
      weeklyHours: 3,
      type: 'لغة أجنبية ثانية',
      totalMarks: 40
    },
    {
      id: 'sub-6',
      nameArabic: 'تكنولوجيا المعلومات والبرمجة',
      nameEnglish: 'Computer Science & AI Basics',
      code: 'ICT-101',
      gradeLevel: 'الصف الأول الإعدادي',
      weeklyHours: 2,
      type: 'منهج وزاري موحد',
      totalMarks: 40
    }
  ]);
}

