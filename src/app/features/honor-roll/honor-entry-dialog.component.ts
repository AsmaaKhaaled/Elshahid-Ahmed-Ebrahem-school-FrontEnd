import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { GRADE_LEVELS, SCHOOL_SUBJECTS } from '../../core/constants/school.constants';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { SubmitLockDirective, submitLock } from '../../shared/directives/submit-lock.directive';
import { ACCEPTED_PHOTO_TYPES, MAX_PHOTO_UPLOAD_MB, resizeImageToSquare } from '../../shared/utils/image-resize';
import { TEACHER_HONORIFIC } from '../teachers/teacher.model';
import { HonorEntry, HonorKind } from './honor-roll.model';
import { HonorAvatarComponent } from './honor-avatar.component';
import { HonorRollApiService, HonorCandidateDto } from '../../core/services/honor-roll.service';

@Component({
  selector: 'app-honor-entry-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    PortalToBodyDirective,
    SubmitLockDirective,
    HonorAvatarComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './honor-entry-dialog.component.html',
  styleUrl: './honor-entry-dialog.component.css'
})
export class HonorEntryDialogComponent implements OnInit {
  private readonly api = inject(HonorRollApiService);

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
  // Locked from the click until the page closes the dialog
  readonly lock = submitLock();
  // Signal copy of the draft photo, so the OnPush preview updates after the async resize
  readonly photoUrl = signal('');

  // Live Autocomplete Candidates State
  readonly candidates = signal<HonorCandidateDto[]>([]);
  readonly isSearchingCandidates = signal(false);
  private searchDebounce?: ReturnType<typeof setTimeout>;

  // Multiple subjects support for teachers
  readonly selectedTeacherSubjects = signal<string[]>([]);

  draft: HonorEntry = {
    id: '',
    kind: 'TEACHER',
    name: '',
    photoUrl: '',
    subjects: [],
    subject: '',
    section: '',
    achievement: '',
    teacherId: null,
    studentId: null
  };

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.searchDebounce));
  }

  ngOnInit(): void {
    const entry = this.entry();
    this.draft = entry ? { ...entry } : { ...this.draft, kind: this.kind() };
    this.photoUrl.set(this.draft.photoUrl);

    if (this.isTeacher) {
      if (this.draft.subjects && this.draft.subjects.length > 0) {
        this.selectedTeacherSubjects.set(this.draft.subjects);
      } else if (this.draft.subject) {
        const parsed = this.draft.subject.split(/[,،]\s*/).map(s => s.trim()).filter(Boolean);
        this.selectedTeacherSubjects.set(parsed);
      }
    }
  }

  get isTeacher(): boolean {
    return this.draft.kind === 'TEACHER';
  }

  onNameChange(value: string): void {
    this.draft.name = value;
    clearTimeout(this.searchDebounce);

    const query = value?.trim();
    if (!query || query.length < 1) {
      this.candidates.set([]);
      this.isSearchingCandidates.set(false);
      return;
    }

    this.isSearchingCandidates.set(true);
    this.searchDebounce = setTimeout(() => {
      this.api.searchCandidates(this.draft.kind, query, 8).subscribe({
        next: res => {
          this.isSearchingCandidates.set(false);
          this.candidates.set(res.data || []);
        },
        error: () => {
          this.isSearchingCandidates.set(false);
          this.candidates.set([]);
        }
      });
    }, 250);
  }

  onCandidateSelected(event: MatAutocompleteSelectedEvent): void {
    const candidate = event.option.value as HonorCandidateDto;
    if (!candidate) return;

    this.draft.name = candidate.name;

    if (this.isTeacher) {
      this.draft.teacherId = candidate.id;
      this.draft.studentId = null;

      // Auto-fill multiple subjects if available, or specialization
      const candidateSubjects = candidate.subjects && candidate.subjects.length > 0
        ? candidate.subjects
        : (candidate.specialization ? [candidate.specialization] : []);

      if (candidateSubjects.length > 0) {
        this.selectedTeacherSubjects.set(candidateSubjects);
        this.draft.subjects = candidateSubjects;
        this.draft.subject = candidateSubjects.join('، ');
      }
    } else {
      this.draft.studentId = candidate.id;
      this.draft.teacherId = null;

      // Auto-fill student section
      if (candidate.section) {
        this.draft.section = candidate.section;
      }
    }

    // Auto-fill photo if provided
    if (candidate.photoUrl && !this.draft.photoUrl) {
      this.setPhoto(candidate.photoUrl);
    }
  }

  onTeacherSubjectsChange(newSubjects: string[]): void {
    this.selectedTeacherSubjects.set(newSubjects);
    this.draft.subjects = newSubjects;
    this.draft.subject = newSubjects.join('، ');
  }

  async onPhotoSelected(event: Event): Promise<void> {
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
    if (this.lock.busy()) return;
    if (form.invalid || this.processingPhoto()) {
      form.control.markAllAsTouched();
      return;
    }

    const teacherSubjects = this.selectedTeacherSubjects();
    const primarySubject = teacherSubjects.join('، ') || this.draft.subject;

    this.lock.run(() =>
      this.saved.emit({
        ...this.draft,
        id: this.draft.id || crypto.randomUUID(),
        name: this.draft.name.trim(),
        achievement: this.draft.achievement?.trim() || '',
        subjects: this.isTeacher ? teacherSubjects : [],
        subject: this.isTeacher ? primarySubject : '',
        section: this.isTeacher ? '' : this.draft.section
      })
    );
  }

  confirmDelete(): void {
    this.lock.run(() => this.deleted.emit(this.draft.id));
  }
}
