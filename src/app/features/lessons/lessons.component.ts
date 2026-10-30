import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';

interface Lesson {
  id: string;
  day: string;
  period: number;
  time: string;
  subject: string;
  teacher: string;
  room: string;
  topic: string;
}

@Component({
  selector: 'app-lessons',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lessons.component.html',
  styleUrl: './lessons.component.css'
})
export class LessonsComponent {
  readonly days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  readonly selectedDay = signal<string>('الأحد');

  readonly lessons = signal<Lesson[]>([
    {
      id: 'l1',
      day: 'الأحد',
      period: 1,
      time: '08:00 - 08:45 AM',
      subject: 'Advanced English',
      teacher: 'أ/ نادية كمال الشربيني',
      room: 'A-101',
      topic: 'Unit 3: Technological Advancements & AI Ethics'
    },
    {
      id: 'l2',
      day: 'الأحد',
      period: 2,
      time: '08:50 - 09:35 AM',
      subject: 'Pure Mathematics',
      teacher: 'أ. د. محمود الشناوي',
      room: 'A-101',
      topic: 'Trigonometry & Polar Coordinates'
    },
    {
      id: 'l3',
      day: 'الأحد',
      period: 3,
      time: '09:40 - 10:25 AM',
      subject: 'Chemistry (لغات)',
      teacher: 'د/ شريف فؤاد',
      room: 'معمل الكيمياء الرئيسي',
      topic: 'Chemical Equilibrium & Reaction Rates'
    },
    {
      id: 'l4',
      day: 'الأحد',
      period: 4,
      time: '10:50 - 11:35 AM',
      subject: 'اللغة العربية',
      teacher: 'الشيخ عبد الرحمن طه',
      room: 'A-101',
      topic: 'النحو: المشتقات وإعمال اسم الفاعل'
    },
    {
      id: 'l5',
      day: 'الأحد',
      period: 5,
      time: '11:40 - 12:25 PM',
      subject: 'French Language',
      teacher: 'مدام جيهان سليم',
      room: 'A-101',
      topic: 'Le subjonctif présent et expression de l\'opinion'
    }
  ]);

  readonly dailyLessons = computed(() => {
    return this.lessons().filter(l => l.day === this.selectedDay());
  });
}

