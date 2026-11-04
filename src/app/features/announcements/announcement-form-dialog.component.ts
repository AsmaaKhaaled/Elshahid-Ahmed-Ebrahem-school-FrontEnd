import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { today } from '../../core/academic/academic-calendar.store';
import { AnnouncementsService, CreateAnnouncementPayload } from '../../core/services/announcements.service';
import { DateFieldComponent } from '../../shared/components/date-field/date-field.component';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { SubmitLockDirective, submitLock } from '../../shared/directives/submit-lock.directive';
import { ANNOUNCEMENT_CATEGORIES, AUDIENCES, Announcement, AnnouncementCategory, AnnouncementsStore, Attachment } from './announcements.store';

const MAX_ATTACHMENT_MB = 10;

@Component({
  selector: 'app-announcement-form-dialog',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, DateFieldComponent, PortalToBodyDirective, SubmitLockDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './announcement-form-dialog.component.html',
  styleUrl: './announcement-form-dialog.component.css'
})
export class AnnouncementFormDialogComponent implements OnInit {
  // null = new announcement
  readonly announcement = input<Announcement | null>(null);
  readonly saved = output<Announcement>();
  readonly closed = output<void>();

  private readonly announcementsService = inject(AnnouncementsService);
  private readonly store = inject(AnnouncementsStore);

  readonly categories = ANNOUNCEMENT_CATEGORIES;
  readonly audiences = AUDIENCES;
  readonly minDate = today();
  readonly fileError = signal('');
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly lock = submitLock();

  draft: Omit<Announcement, 'expiresAt'> & { expiresAt: string } = {
    id: '',
    title: '',
    content: '',
    category: 'إداري',
    audiences: ['TEACHER', 'STUDENT', 'PARENT'],
    author: 'إدارة المدرسة',
    publishedAt: '',
    expiresAt: '',
    pinned: false
  };

  ngOnInit(): void {
    const announcement = this.announcement();
    if (announcement) {
      this.draft = { ...announcement, audiences: [...announcement.audiences], expiresAt: announcement.expiresAt ?? '' };
    }
  }

  // Urgent announcements are pinned by default (can still be unchecked)
  onCategoryChange(category: AnnouncementCategory): void {
    this.draft.category = category;
    if (category === 'عاجل وهام') {
      this.draft.pinned = true;
    }
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
      this.fileError.set(`حجم الملف أكبر من ${MAX_ATTACHMENT_MB} ميجا`);
      return;
    }
    this.fileError.set('');
    const attachment: Attachment = { name: file.name, url: URL.createObjectURL(file) };
    this.draft.attachment = attachment;
  }

  save(form: NgForm): void {
    if (this.isSaving()) return;
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    const { expiresAt, ...rest } = this.draft;
    const payload: CreateAnnouncementPayload = {
      title: rest.title.trim(),
      category: rest.category,
      audiences: rest.audiences,
      content: rest.content.trim(),
      author: rest.author.trim(),
      expiresAt: expiresAt || undefined,
      pinned: rest.pinned,
      attachment: rest.attachment
    };

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const isUpdate = !!rest.id && !rest.id.startsWith('anc-');
    const request$ = isUpdate
      ? this.announcementsService.update(rest.id, payload)
      : this.announcementsService.create(payload);

    request$.subscribe({
      next: res => {
        this.isSaving.set(false);
        const savedAnnouncement: Announcement = (res.data || {
          ...payload,
          id: rest.id || crypto.randomUUID(),
          publishedAt: rest.publishedAt || new Date().toISOString(),
          isRead: true
        }) as Announcement;

        this.store.addAnnouncement(savedAnnouncement);
        this.saved.emit(savedAnnouncement);
        this.closed.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.isSaving.set(false);
        this.errorMessage.set(err?.error?.message || 'تعذر نشر الإعلان، يرجى التحقق من الاتصال والمحاولة لاحقاً.');
      }
    });
  }
}
