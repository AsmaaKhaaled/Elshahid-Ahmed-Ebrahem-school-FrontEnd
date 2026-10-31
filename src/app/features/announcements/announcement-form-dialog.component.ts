import { ChangeDetectionStrategy, Component, OnInit, input, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { today } from '../../core/academic/academic-calendar.store';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { SubmitLockDirective, submitLock } from '../../shared/directives/submit-lock.directive';
import { ANNOUNCEMENT_CATEGORIES, AUDIENCES, Announcement, AnnouncementCategory, Attachment } from './announcements.store';

const MAX_ATTACHMENT_MB = 10;

@Component({
  selector: 'app-announcement-form-dialog',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, PortalToBodyDirective, SubmitLockDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './announcement-form-dialog.component.html',
  styleUrl: './announcement-form-dialog.component.css'
})
export class AnnouncementFormDialogComponent implements OnInit {
  // null = new announcement
  readonly announcement = input<Announcement | null>(null);
  readonly saved = output<Announcement>();
  readonly closed = output<void>();

  readonly categories = ANNOUNCEMENT_CATEGORIES;
  readonly audiences = AUDIENCES;
  readonly minDate = today();
  readonly fileError = signal('');
  // Locked from the click until the page closes the dialog
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
    if (this.lock.busy()) return;
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }
    const { expiresAt, ...rest } = this.draft;
    this.lock.run(() =>
      this.saved.emit({
        ...rest,
        title: rest.title.trim(),
        content: rest.content.trim(),
        author: rest.author.trim(),
        expiresAt: expiresAt || undefined,
        id: rest.id || crypto.randomUUID(),
        publishedAt: rest.publishedAt || new Date().toISOString()
      })
    );
  }
}
