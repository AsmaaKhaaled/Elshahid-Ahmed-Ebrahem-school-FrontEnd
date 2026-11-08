import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { ACCEPTED_PHOTO_TYPES, MAX_PHOTO_UPLOAD_MB, resizeImage } from '../../shared/utils/image-resize';
import { GallerySlideDialogComponent } from './gallery-slide-dialog.component';
import { GallerySlide, toParagraphs } from './home-content.model';
import { HomeContentStore } from './home-content.store';

/** Admin management of the home page: the principal's word & photo and the activities carousel. */
@Component({
  selector: 'app-home-content',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, RouterLink, GallerySlideDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home-content.component.html'
})
export class HomeContentComponent {
  private readonly store = inject(HomeContentStore);

  readonly acceptedTypes = ACCEPTED_PHOTO_TYPES.join(',');
  private noticeTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.noticeTimer));
  }

  // ---- كلمة المدير ----

  // The form's copy; saved to the home page only on "حفظ"
  readonly principalDraft = signal(this.toDraft());
  readonly principalNotice = signal<string | null>(null);
  readonly photoError = signal<string | null>(null);
  readonly processingPhoto = signal(false);
  readonly principalDirty = computed(() => JSON.stringify(this.principalDraft()) !== JSON.stringify(this.toDraft()));

  updatePrincipal(field: 'name' | 'title' | 'message', value: string): void {
    this.principalDraft.update(draft => ({ ...draft, [field]: value }));
  }

  async onPrincipalPhoto(event: Event): Promise<void> {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;

    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      this.photoError.set('اختر صورة بصيغة JPG أو PNG أو WEBP');
      return;
    }
    if (file.size > MAX_PHOTO_UPLOAD_MB * 1024 * 1024) {
      this.photoError.set(`حجم الصورة أكبر من ${MAX_PHOTO_UPLOAD_MB} ميجا`);
      return;
    }

    this.photoError.set(null);
    this.processingPhoto.set(true);
    try {
      const photoUrl = await resizeImage(file, 720);
      this.principalDraft.update(draft => ({ ...draft, photoUrl }));
    } catch {
      this.photoError.set('تعذر قراءة الصورة، جرّب صورة أخرى');
    } finally {
      this.processingPhoto.set(false);
    }
  }

  savePrincipal(form: NgForm): void {
    const draft = this.principalDraft();
    if (form.invalid || this.processingPhoto() || !toParagraphs(draft.message).length) {
      form.control.markAllAsTouched();
      return;
    }
    this.store.savePrincipal({
      name: draft.name.trim(),
      title: draft.title.trim(),
      photoUrl: draft.photoUrl,
      message: toParagraphs(draft.message)
    });
    this.principalDraft.set(this.toDraft());
    clearTimeout(this.noticeTimer);
    this.principalNotice.set('تم حفظ كلمة المدير، وظهرت في الصفحة الرئيسية.');
    this.noticeTimer = setTimeout(() => this.principalNotice.set(null), 4000);
  }

  discardPrincipal(): void {
    this.principalDraft.set(this.toDraft());
    this.photoError.set(null);
  }

  private toDraft() {
    const principal = this.store.principal();
    return { name: principal.name, title: principal.title, photoUrl: principal.photoUrl, message: principal.message.join('\n\n') };
  }

  // ---- صور الأنشطة ----

  readonly slides = this.store.slides;
  readonly shownCount = computed(() => this.store.visibleSlides().length);
  readonly showDialog = signal(false);
  readonly editingSlide = signal<GallerySlide | null>(null);

  openDialog(slide: GallerySlide | null): void {
    this.editingSlide.set(slide);
    this.showDialog.set(true);
  }

  saveSlide(slide: GallerySlide): void {
    this.store.saveSlide(slide);
    this.showDialog.set(false);
  }

  deleteSlide(slideId: string): void {
    this.store.deleteSlide(slideId);
    this.showDialog.set(false);
  }

  moveSlide(slideId: string, step: -1 | 1): void {
    this.store.moveSlide(slideId, step);
  }

  toggleHidden(slideId: string): void {
    this.store.toggleHidden(slideId);
  }
}
