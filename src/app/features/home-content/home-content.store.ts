import { Injectable, computed, signal } from '@angular/core';
import { SCHOOL_INFO } from '../../core/constants/school.constants';
import { GallerySlide, PrincipalWord } from './home-content.model';

/**
 * What the admins change on the public home page: the principal's word & photo,
 * and the photos of the school activities carousel.
 * Managed from /admin/home-content. TODO: kept in memory until the backend stores it.
 */
@Injectable({ providedIn: 'root' })
export class HomeContentStore {
  readonly principal = signal<PrincipalWord>({
    name: SCHOOL_INFO.principal,
    title: 'مدير المدرسة',
    photoUrl: 'images/principal-placeholder.svg',
    message: [
      'أبنائي الطلاب، السادة أولياء الأمور، زملائي المعلمين... أهلاً بكم في البوابة الإلكترونية لمدرستنا.',
      'نؤمن بأن المدرسة بيت ثانٍ يصنع العقول ويبني الشخصية، ونسعى كل يوم لتقديم تعليم متميز يواكب العصر، في بيئة آمنة تحترم الطالب وتنمّي مواهبه.',
      'ستظل أبوابنا مفتوحة دائماً لكل اقتراح يخدم أبناءنا، فالتعاون بين البيت والمدرسة هو طريقنا للتفوق والنجاح.'
    ]
  });

  // Placeholder images until the admins upload the school's real photos
  readonly slides = signal<GallerySlide[]>([
    { id: 'slide-1', src: 'images/gallery/activities.svg', title: 'الأنشطة الطلابية', caption: 'طلابنا في أنشطة متنوعة تنمّي مواهبهم وروح الفريق.', hidden: false },
    { id: 'slide-2', src: 'images/gallery/sports.svg', title: 'الأنشطة الرياضية', caption: 'دوري المدرسة والمسابقات الرياضية بين الفصول.', hidden: false },
    { id: 'slide-3', src: 'images/gallery/labs.svg', title: 'المعامل والتجارب العلمية', caption: 'تعلّم بالتجربة داخل معامل العلوم والحاسب الآلي.', hidden: false },
    { id: 'slide-4', src: 'images/gallery/arts.svg', title: 'الأنشطة الفنية والمسرحية', caption: 'معارض الرسم وعروض المسرح المدرسي في المناسبات.', hidden: false },
    { id: 'slide-5', src: 'images/gallery/honors.svg', title: 'حفلات التكريم والتفوق', caption: 'تكريم الطلاب المتفوقين والمعلمين المتميزين.', hidden: false }
  ]);

  /** The photos the home page shows, in the admins' order. */
  readonly visibleSlides = computed(() => this.slides().filter(s => !s.hidden));

  savePrincipal(principal: PrincipalWord): void {
    this.principal.set(principal);
  }

  saveSlide(slide: GallerySlide): void {
    this.slides.update(list =>
      list.some(s => s.id === slide.id) ? list.map(s => (s.id === slide.id ? slide : s)) : [...list, slide]
    );
  }

  deleteSlide(slideId: string): void {
    this.slides.update(list => list.filter(s => s.id !== slideId));
  }

  /** Moves a photo one place earlier (-1) or later (+1) in the carousel. */
  moveSlide(slideId: string, step: -1 | 1): void {
    this.slides.update(list => {
      const from = list.findIndex(s => s.id === slideId);
      const to = from + step;
      if (from < 0 || to < 0 || to >= list.length) return list;
      const moved = [...list];
      [moved[from], moved[to]] = [moved[to], moved[from]];
      return moved;
    });
  }

  toggleHidden(slideId: string): void {
    this.slides.update(list => list.map(s => (s.id === slideId ? { ...s, hidden: !s.hidden } : s)));
  }
}
