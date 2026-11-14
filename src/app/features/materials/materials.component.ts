import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, of, switchMap } from 'rxjs';
import { errorMessageOf } from '../../core/interceptors/notify.interceptor';
import { PAGE_SIZE_OPTIONS, loadPageSize, savePageSize } from '../../shared/components/pagination/page-size';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { TeachingFilesComponent } from '../teaching/teaching-files.component';
import { Material, sectionsLabel } from '../teaching/teaching.model';
import { TeachingScope } from '../teaching/teaching-scope.service';
import { MaterialFormDialogComponent } from './material-form-dialog.component';
import { MaterialsPage, MaterialsQuery, MaterialsService } from './materials.service';

const ALL_SUBJECTS = 'الكل';
const LIST_SIZE_KEY = 'materials';
const SEARCH_DELAY_MS = 300;

/**
 * Lesson materials: a teacher uploads to their classes, a student downloads their class's
 * (they see it as soon as the teacher saves it). Paged on the server.
 */
@Component({
  selector: 'app-materials',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TimeAgoPipe, PaginationComponent, TeachingFilesComponent, MaterialFormDialogComponent],
  templateUrl: './materials.component.html'
})
export class MaterialsComponent {
  private readonly service = inject(MaterialsService);
  readonly scope = inject(TeachingScope);

  readonly sectionsLabel = sectionsLabel;
  readonly allSubjects = ALL_SUBJECTS;
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  readonly page = signal(1);
  readonly pageSize = signal(loadPageSize(LIST_SIZE_KEY));
  readonly searchQuery = signal('');
  readonly selectedSubject = signal(ALL_SUBJECTS);
  readonly list = signal<MaterialsPage | null>(null);
  readonly loading = signal(false);
  readonly listError = signal<string | null>(null);

  readonly formOpen = signal(false);
  readonly saving = signal(false);
  readonly editing = signal<Material | null>(null);
  readonly confirmingDeleteId = signal<string | null>(null);
  readonly deleting = signal(false);

  readonly materials = computed(() => this.list()?.materials ?? []);

  readonly subjectTabs = computed(() => {
    const subjects = this.list()?.subjects ?? [];
    return [
      { id: ALL_SUBJECTS, count: subjects.reduce((sum, s) => sum + s.count, 0) },
      ...subjects.map(s => ({ id: s.subject, count: s.count }))
    ];
  });

  private readonly listQuery = new Subject<MaterialsQuery>();
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.scope.ensureLoaded();
    // switchMap drops the answer of an older request when the page / search changes quickly
    this.listQuery
      .pipe(
        switchMap(query => {
          this.loading.set(true);
          this.listError.set(null);
          return this.service.list(query).pipe(
            catchError((err: unknown) => {
              this.listError.set(err instanceof HttpErrorResponse ? errorMessageOf(err) : 'تعذر تحميل المواد التعليمية.');
              return of(null);
            })
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe(result => {
        this.loading.set(false);
        if (!result) return;
        // The subject shown has nothing left (its last material was deleted): back to all of them
        const subject = this.selectedSubject();
        if (subject !== ALL_SUBJECTS && !result.subjects.some(s => s.subject === subject)) {
          this.selectSubject(ALL_SUBJECTS);
          return;
        }
        this.list.set(result);
      });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.searchTimer));
    this.load();
  }

  load(): void {
    const subject = this.selectedSubject();
    this.listQuery.next({
      page: this.page(),
      limit: this.pageSize(),
      search: this.searchQuery().trim(),
      subject: subject === ALL_SUBJECTS ? '' : subject
    });
  }

  selectSubject(subject: string): void {
    this.selectedSubject.set(subject);
    this.page.set(1);
    this.load();
  }

  onSearch(value: string): void {
    this.searchQuery.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page.set(1);
      this.load();
    }, SEARCH_DELAY_MS);
  }

  goToPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  changePageSize(size: number): void {
    savePageSize(LIST_SIZE_KEY, size);
    this.pageSize.set(size);
    this.page.set(1);
    this.load();
  }

  openForm(material: Material | null): void {
    this.editing.set(material);
    this.formOpen.set(true);
  }

  /** Errors are announced by the notify interceptor; the dialog stays open to try again. */
  saveMaterial(material: Material): void {
    const existing = this.editing();
    this.saving.set(true);
    (existing ? this.service.update(material) : this.service.create(material)).subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        // A new one is the newest: show it on the first page
        if (!existing) this.page.set(1);
        this.load();
      },
      error: () => this.saving.set(false)
    });
  }

  deleteMaterial(id: string): void {
    this.deleting.set(true);
    this.service.remove(id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.confirmingDeleteId.set(null);
        // The last one of its page: go back a page
        if (this.materials().length === 1 && this.page() > 1) this.page.update(page => page - 1);
        this.load();
      },
      error: () => {
        this.deleting.set(false);
        this.confirmingDeleteId.set(null);
      }
    });
  }
}
