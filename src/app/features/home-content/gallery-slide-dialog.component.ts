import { ChangeDetectionStrategy, Component, OnInit, input, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { SubmitLockDirective, submitLock } from '../../shared/directives/submit-lock.directive';
import { ACCEPTED_PHOTO_TYPES, MAX_PHOTO_UPLOAD_MB, resizeImage } from '../../shared/utils/image-resize';
import { GallerySlide } from './home-content.model';

/** Adds or edits one photo of the home page carousel: the photo, its title and the caption under it. */
@Component({
  selector: 'app-gallery-slide-dialog',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, PortalToBodyDirective, SubmitLockDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gallery-slide-dialog.component.html'
})
export class GallerySlideDialogComponent implements OnInit {
  // null = add mode
  readonly slide = input<GallerySlide | null>(null);
  readonly saved = output<GallerySlide>();
  readonly deleted = output<string>();
  readonly closed = output<void>();

  readonly acceptedTypes = ACCEPTED_PHOTO_TYPES.join(',');
  readonly confirmingDelete = signal(false);
  readonly photoError = signal<string | null>(null);
  readonly processingPhoto = signal(false);
  readonly lock = submitLock();
  // Signal copy of the draft photo, so the OnPush preview updates after the async resize
  readonly src = signal('');

  draft: GallerySlide = { id: '', src: '', title: '', caption: '', hidden: false };

  ngOnInit(): void {
    const slide = this.slide();
    if (slide) this.draft = { ...slide };
    this.src.set(this.draft.src);
  }

  async onPhotoSelected(event: Event): Promise<void> {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput.files?.[0];
    // Reset so picking the same file again still triggers (change)
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
      this.draft.src = await resizeImage(file);
      this.src.set(this.draft.src);
    } catch {
      this.photoError.set('تعذر قراءة الصورة، جرّب صورة أخرى');
    } finally {
      this.processingPhoto.set(false);
    }
  }

  save(form: NgForm): void {
    if (this.lock.busy()) return;
    if (!this.draft.src) this.photoError.set('ارفع صورة النشاط');
    if (form.invalid || !this.draft.src || this.processingPhoto()) {
      form.control.markAllAsTouched();
      return;
    }
    this.lock.run(() =>
      this.saved.emit({
        ...this.draft,
        id: this.draft.id || crypto.randomUUID(),
        title: this.draft.title.trim(),
        caption: this.draft.caption.trim()
      })
    );
  }

  confirmDelete(): void {
    this.lock.run(() => this.deleted.emit(this.draft.id));
  }
}
