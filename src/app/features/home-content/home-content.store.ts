import { Injectable, computed, inject, signal } from '@angular/core';
import { SCHOOL_INFO } from '../../core/constants/school.constants';
import { GallerySlide, PrincipalWord } from './home-content.model';
import { HomeContentApiService } from '../../core/services/home-content.service';

const STORAGE_KEY_PRINCIPAL = 'school_home_principal_word_v1';
const STORAGE_KEY_SLIDES = 'school_home_slides_v1';

const DEFAULT_PRINCIPAL: PrincipalWord = {
  name: SCHOOL_INFO.principal,
  title: 'مدير المدرسة',
  photoUrl: 'images/principal-placeholder.svg',
  message: [
    'أبنائي الطلاب، السادة أولياء الأمور، زملائي المعلمين... أهلاً بكم في البوابة الإلكترونية لمدرستنا.',
    'نؤمن بأن المدرسة بيت ثانٍ يصنع العقول ويبني الشخصية، ونسعى كل يوم لتقديم تعليم متميز يواكب العصر، في بيئة آمنة تحترم الطالب وتنمّي مواهبه.',
    'ستظل أبوابنا مفتوحة دائماً لكل اقتراح يخدم أبناءنا، فالتعاون بين البيت والمدرسة هو طريقنا للتفوق والنجاح.'
  ]
};

const DEFAULT_SLIDES: GallerySlide[] = [
  { id: 'slide-1', src: 'images/gallery/activities.svg', title: 'الأنشطة الطلابية', caption: 'طلابنا في أنشطة متنوعة تنمّي مواهبهم وروح الفريق.', hidden: false },
  { id: 'slide-2', src: 'images/gallery/sports.svg', title: 'الأنشطة الرياضية', caption: 'دوري المدرسة والمسابقات الرياضية بين الفصول.', hidden: false },
  { id: 'slide-3', src: 'images/gallery/labs.svg', title: 'المعامل والتجارب العلمية', caption: 'تعلّم بالتجربة داخل معامل العلوم والحاسب الآلي.', hidden: false },
  { id: 'slide-4', src: 'images/gallery/arts.svg', title: 'الأنشطة الفنية والمسرحية', caption: 'معارض الرسم وعروض المسرح المدرسي في المناسبات.', hidden: false },
  { id: 'slide-5', src: 'images/gallery/honors.svg', title: 'حفلات التكريم والتفوق', caption: 'تكريم الطلاب المتفوقين والمعلمين المتميزين.', hidden: false }
];

function loadStoredPrincipal(): PrincipalWord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRINCIPAL);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.name && Array.isArray(parsed.message)) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_PRINCIPAL;
}

function loadStoredSlides(): GallerySlide[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SLIDES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_SLIDES;
}

/**
 * What the admins change on the public home page: the principal's word & photo,
 * and the photos of the school activities carousel.
 * Syncs with Backend API and persists in localStorage for offline resilience.
 */
@Injectable({ providedIn: 'root' })
export class HomeContentStore {
  private readonly api = inject(HomeContentApiService);

  readonly principal = signal<PrincipalWord>(loadStoredPrincipal());
  readonly slides = signal<GallerySlide[]>(loadStoredSlides());
  readonly isSaving = signal<boolean>(false);

  /** The photos the home page shows, in the admins' order. */
  readonly visibleSlides = computed(() => this.slides().filter(s => !s.hidden));

  constructor() {
    this.syncFromBackend();
  }

  private syncFromBackend(): void {
    this.api.getPrincipalWord().subscribe({
      next: res => {
        if (res?.data && res.data.name) {
          this.principal.set(res.data);
          try {
            localStorage.setItem(STORAGE_KEY_PRINCIPAL, JSON.stringify(res.data));
          } catch {}
        }
      },
      error: () => {
        // Fallback silently to localStorage/defaults if backend is not yet deployed
      }
    });
  }

  savePrincipal(principal: PrincipalWord): void {
    // 1. Instant optimistic update
    this.principal.set(principal);

    // 2. Persist locally immediately
    try {
      localStorage.setItem(STORAGE_KEY_PRINCIPAL, JSON.stringify(principal));
    } catch {}

    // 3. Sync to Backend API
    this.isSaving.set(true);
    this.api.updatePrincipalWord(principal).subscribe({
      next: res => {
        this.isSaving.set(false);
        if (res?.data) {
          this.principal.set(res.data);
          try {
            localStorage.setItem(STORAGE_KEY_PRINCIPAL, JSON.stringify(res.data));
          } catch {}
        }
      },
      error: err => {
        this.isSaving.set(false);
        console.warn('[HomeContentStore] Backend update failed, changes kept in localStorage.', err?.message);
      }
    });
  }

  saveSlide(slide: GallerySlide): void {
    this.slides.update(list => {
      const updated = list.some(s => s.id === slide.id) ? list.map(s => (s.id === slide.id ? slide : s)) : [...list, slide];
      try {
        localStorage.setItem(STORAGE_KEY_SLIDES, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }

  deleteSlide(slideId: string): void {
    this.slides.update(list => {
      const updated = list.filter(s => s.id !== slideId);
      try {
        localStorage.setItem(STORAGE_KEY_SLIDES, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }

  /** Moves a photo one place earlier (-1) or later (+1) in the carousel. */
  moveSlide(slideId: string, step: -1 | 1): void {
    this.slides.update(list => {
      const from = list.findIndex(s => s.id === slideId);
      const to = from + step;
      if (from < 0 || to < 0 || to >= list.length) return list;
      const moved = [...list];
      [moved[from], moved[to]] = [moved[to], moved[from]];
      try {
        localStorage.setItem(STORAGE_KEY_SLIDES, JSON.stringify(moved));
      } catch {}
      return moved;
    });
  }

  toggleHidden(slideId: string): void {
    this.slides.update(list => {
      const updated = list.map(s => (s.id === slideId ? { ...s, hidden: !s.hidden } : s));
      try {
        localStorage.setItem(STORAGE_KEY_SLIDES, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }
}
