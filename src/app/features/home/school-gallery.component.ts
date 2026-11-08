import { ChangeDetectionStrategy, Component, DestroyRef, afterNextRender, computed, inject, input, signal } from '@angular/core';

export interface GalleryPhoto {
  src: string;
  title: string;
  caption: string;
}

// Time each photo stays on screen
const SLIDE_MS = 5000;
// How far a finger must move to change the photo
const SWIPE_PX = 40;

/**
 * Photos of school life (activities, sports, labs...), one at a time with a cross-fade.
 * Plays by itself; stops while hovered / focused, while the tab is hidden, and for users who prefer less motion.
 */
@Component({
  selector: 'app-school-gallery',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="relative overflow-hidden rounded-2xl sm:rounded-3xl shadow-card bg-portal-navyDark aspect-[4/3] sm:aspect-[16/7] select-none"
      role="region" aria-roledescription="carousel" aria-label="صور من المدرسة" tabindex="0"
      (mouseenter)="paused.set(true)" (mouseleave)="paused.set(false)" (focusin)="paused.set(true)" (focusout)="paused.set(false)"
      (keydown.arrowleft)="next()" (keydown.arrowright)="previous()"
      (touchstart)="touchStart($event)" (touchend)="touchEnd($event)">
      @for (photo of photos(); track $index; let i = $index) {
        <figure class="absolute inset-0 m-0 transition-opacity duration-700 ease-out"
          [class.opacity-100]="i === current()" [class.opacity-0]="i !== current()" [attr.aria-hidden]="i !== current()"
          role="group" aria-roledescription="slide" [attr.aria-label]="(i + 1) + ' من ' + photos().length">
          <img [src]="photo.src" [alt]="photo.title" class="w-full h-full object-cover" [attr.loading]="i === 0 ? 'eager' : 'lazy'" />
          <figcaption class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-5 sm:px-8 pt-16 pb-10 sm:pb-12 text-right text-white">
            <h3 class="text-base sm:text-xl md:text-2xl font-black">{{ photo.title }}</h3>
            <p class="mt-1 text-xs sm:text-sm text-white/85 max-w-2xl leading-relaxed">{{ photo.caption }}</p>
          </figcaption>
        </figure>
      }

      @if (photos().length > 1) {
        <!-- Previous on the right, next on the left (RTL) -->
        <button type="button" (click)="previous()" aria-label="الصورة السابقة"
          class="absolute top-1/2 -translate-y-1/2 right-3 sm:right-4 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/85 hover:bg-white text-portal-navy shadow-md flex items-center justify-center transition-colors">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" /></svg>
        </button>
        <button type="button" (click)="next()" aria-label="الصورة التالية"
          class="absolute top-1/2 -translate-y-1/2 left-3 sm:left-4 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/85 hover:bg-white text-portal-navy shadow-md flex items-center justify-center transition-colors">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" /></svg>
        </button>

        <div class="absolute bottom-3 sm:bottom-4 inset-x-0 flex items-center justify-center gap-1.5">
          @for (photo of photos(); track $index; let i = $index) {
            <button type="button" (click)="go(i)" [attr.aria-label]="'عرض صورة ' + photo.title" [attr.aria-current]="i === current()"
              class="h-2 rounded-full transition-all"
              [class]="i === current() ? 'w-6 bg-amber-400' : 'w-2 bg-white/60 hover:bg-white'"></button>
          }
        </div>
      }
    </div>
  `
})
export class SchoolGalleryComponent {
  readonly photos = input.required<GalleryPhoto[]>();

  readonly index = signal(0);
  // Stays in range when the admins remove or hide photos
  readonly current = computed(() => Math.min(this.index(), Math.max(0, this.photos().length - 1)));
  readonly paused = signal(false);
  private touchX: number | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      const timer = setInterval(() => {
        if (!this.paused() && !document.hidden) this.next();
      }, SLIDE_MS);
      destroyRef.onDestroy(() => clearInterval(timer));
    });
  }

  next(): void {
    const count = this.photos().length;
    if (count) this.index.set((this.current() + 1) % count);
  }

  previous(): void {
    const count = this.photos().length;
    if (count) this.index.set((this.current() - 1 + count) % count);
  }

  go(i: number): void {
    this.index.set(i);
  }

  touchStart(event: TouchEvent): void {
    this.touchX = event.changedTouches[0]?.clientX ?? null;
  }

  // RTL: swiping to the right brings the next photo
  touchEnd(event: TouchEvent): void {
    if (this.touchX === null) return;
    const dx = (event.changedTouches[0]?.clientX ?? this.touchX) - this.touchX;
    this.touchX = null;
    if (dx > SWIPE_PX) this.next();
    else if (dx < -SWIPE_PX) this.previous();
  }
}
