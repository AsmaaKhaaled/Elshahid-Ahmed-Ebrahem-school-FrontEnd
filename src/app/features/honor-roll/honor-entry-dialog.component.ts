import { ChangeDetectionStrategy, Component, OnInit, input, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { GRADE_LEVELS, SCHOOL_SUBJECTS } from '../../core/constants/school.constants';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { ACCEPTED_PHOTO_TYPES, MAX_PHOTO_UPLOAD_MB, resizeImageToSquare } from '../../shared/utils/image-resize';
import { TEACHER_HONORIFIC } from '../teachers/teacher.model';
import { HonorEntry, HonorKind } from './honor-roll.model';
import { HonorAvatarComponent } from './honor-avatar.component';

@Component({
  selector: 'app-honor-entry-dialog',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, PortalToBodyDirective, HonorAvatarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './honor-entry-dialog.component.html',
  styleUrl: './honor-entry-dialog.component.css'
})
export class HonorEntryDialogComponent implements OnInit {
  // Used in add mode; edit mode takes the kind from the entry
  readonly kind = input<HonorKind>('TEACHER');
  // null = add mode
  readonly entry = input<HonorEntry | null>(null);
  readonly saved = output<HonorEntry>();
  readonly deleted = output<string>();
  readonly closed = output<void>();

  readonly honorific = TEACHER_HONORIFIC;
  readonly subjects = SCHOOL_SUBJECTS;
  readonly grades = GRADE_LEVELS;
  readonly acceptedTypes = ACCEPTED_PHOTO_TYPES.join(',');
  readonly confirmingDelete = signal(false);
  readonly photoError = signal<string | null>(null);
  readonly processingPhoto = signal(false);
  // Signal copy of the draft photo, so the OnPush preview updates after the async resize
  readonly photoUrl = signal('');

  draft: HonorEntry = { id: '', kind: 'TEACHER', name: '', photoUrl: '', subject: '', section: '', achievement: '' };

  ngOnInit(): void {
    const entry = this.entry();
    this.draft = entry ? { ...entry } : { ...this.draft, kind: this.kind() };
    this.photoUrl.set(this.draft.photoUrl);
  }

  get isTeacher(): boolean {
    return this.draft.kind === 'TEACHER';
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
      this.setPhoto(await resizeImageToSquare(file));
    } catch {
      this.photoError.set('تعذر قراءة الصورة، جرّب صورة أخرى');
    } finally {
      this.processingPhoto.set(false);
    }
  }

  setPhoto(photoUrl: string): void {
    this.draft.photoUrl = photoUrl;
    this.photoUrl.set(photoUrl);
  }

  save(form: NgForm): void {
    if (form.invalid || this.processingPhoto()) {
      form.control.markAllAsTouched();
      return;
    }
    this.saved.emit({
      ...this.draft,
      id: this.draft.id || crypto.randomUUID(),
      name: this.draft.name.trim(),
      achievement: this.draft.achievement.trim(),
      // Only keep the field that belongs to this kind
      subject: this.isTeacher ? this.draft.subject : '',
      section: this.isTeacher ? '' : this.draft.section
    });
  }
}
