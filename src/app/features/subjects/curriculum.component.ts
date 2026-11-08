import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, catchError, concatMap, of, switchMap } from 'rxjs';
import { GRADE_LEVELS } from '../../core/constants/school.constants';
import { PAGE_SIZE_OPTIONS, loadPageSize, savePageSize } from '../../shared/components/pagination/page-size';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { MaterialsComponent } from '../materials/materials.component';
import { fileSizeLabel, sectionsLabel } from '../teaching/teaching.model';
import { TeachingScope } from '../teaching/teaching-scope.service';
import { CurriculumFileDialogComponent } from './curriculum-file-dialog.component';
import { CurriculumFormDialogComponent } from './curriculum-form-dialog.component';
import { CurriculumPlan, CurriculumPlanDialogComponent } from './curriculum-plan-dialog.component';
import {
  CURRICULUM_FILE_KINDS, Curriculum, CurriculumDraft, CurriculumFile, CurriculumFileKind, NewCurriculumFile, curriculumErrorMessage,
  curriculumKinds, gradeLabel
} from './curriculum.model';
import { CurriculaPage, CurriculumFilesPage, CurriculumService } from './curriculum.service';
import { CurriculumStore } from './curriculum.store';

const LIST_SIZE_KEY = 'curricula';
const FILES_SIZE_KEY = 'curriculum-files';
const SEARCH_DELAY_MS = 300;

type TeacherView = 'curricula' | 'materials';
type PendingDelete = { type: 'curriculum' | 'file'; id: string } | null;
interface ListQuery { page: number; limit: number; search: string; gradeId: string }
interface FilesQuery { id: string; page: number; limit: number; kind: CurriculumFileKind | null }

/**
 * المناهج والمواد الدراسية: each teacher uploads the ministry curriculum of their own subjects
 * (the textbook, the plan, sample exams... as files or links); a student gets their class's;
 * the administration reads every teacher's. Everything is paged on the server.
 */
@Component({
  selector: 'app-curriculum',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, TimeAgoPipe, PaginationComponent, MaterialsComponent, CurriculumFormDialogComponent, CurriculumFileDialogComponent, CurriculumPlanDialogComponent],
  templateUrl: './curriculum.component.html'
})
export class CurriculumComponent {
  private readonly service = inject(CurriculumService);
  private readonly store = inject(CurriculumStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly scope = inject(TeachingScope);

  readonly gradeLabel = gradeLabel;
  readonly sectionsLabel = sectionsLabel;
  readonly kindsOf = curriculumKinds;
  readonly fileKinds = CURRICULUM_FILE_KINDS;
  readonly sizeOf = fileSizeLabel;
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  // The teacher's page holds both their curricula and their lesson materials (?tab=materials)
  readonly teacherTabs = [
    { id: 'curricula', label: 'المناهج' },
    { id: 'materials', label: 'المواد والملفات التعليمية' }
  ] as const;
  readonly view = signal<TeacherView>(
    this.route.snapshot.queryParamMap.get('tab') === 'materials' && this.scope.isTeacher() ? 'materials' : 'curricula'
  );

  selectView(view: TeacherView): void {
    if (view === this.view()) return;
    this.view.set(view);
    // Kept in the address, so a refresh / back stays on the same tab
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab: view === 'materials' ? view : null }, replaceUrl: true });
  }

  /** The plan & objectives are for the teacher and the administration, not the students. */
  readonly showPlan = computed(() => !this.scope.isStudent());
  /** The administration reads every teacher's curricula, so it can search them. */
  readonly showSearch = computed(() => !this.scope.isTeacher() && !this.scope.isStudent());

  // ---- The list (one page at a time) ----
  readonly page = signal(1);
  readonly pageSize = signal(loadPageSize(LIST_SIZE_KEY));
  readonly search = signal('');
  // The administration browses the curricula grade by grade ('' = every grade)
  readonly selectedGrade = signal('');
  readonly list = signal<CurriculaPage | null>(null);
  readonly loadingList = signal(false);
  readonly listError = signal<string | null>(null);
  readonly curricula = computed(() => this.list()?.curricula ?? []);

  /** One tab per grade with how many curricula it has (they follow the search). */
  readonly gradeTabs = computed(() => {
    const counts = this.list()?.gradeCounts ?? {};
    const grades = GRADE_LEVELS.map(grade => ({ id: grade.id, label: grade.shortLabel, count: counts[grade.id] ?? 0 }));
    return [{ id: '', label: 'كل الصفوف', count: grades.reduce((sum, g) => sum + g.count, 0) }, ...grades];
  });

  /** The page's curricula under their grade's heading (the administration's view). */
  readonly curriculaByGrade = computed(() =>
    GRADE_LEVELS.map(grade => ({ grade, curricula: this.curricula().filter(c => c.gradeId === grade.id) })).filter(
      group => group.curricula.length
    )
  );

  // ---- One curriculum opened ----
  readonly selectedId = signal<string | null>(null);
  readonly selected = signal<Curriculum | null>(null);
  readonly loadingDetail = signal(false);
  readonly detailError = signal<string | null>(null);

  // Its files: one kind (or all) at a time, paged
  readonly fileKind = signal<CurriculumFileKind | null>(null);
  readonly filesPage = signal(1);
  readonly filesPageSize = signal(loadPageSize(FILES_SIZE_KEY));
  readonly files = signal<CurriculumFilesPage | null>(null);
  readonly loadingFiles = signal(false);
  readonly filesError = signal<string | null>(null);

  // Dialogs and their requests
  readonly formOpen = signal(false);
  readonly editingCurriculum = signal<Curriculum | null>(null);
  readonly presetSubject = signal('');
  readonly fileDialogOpen = signal(false);
  readonly planDialogOpen = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly pendingDelete = signal<PendingDelete>(null);
  readonly actionError = signal<string | null>(null);

  private readonly listQuery = new Subject<ListQuery>();
  private readonly filesQuery = new Subject<FilesQuery>();
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.scope.ensureLoaded();
    // switchMap drops the answer of an older request when the page / search changes quickly
    this.listQuery
      .pipe(
        switchMap(query => {
          this.loadingList.set(true);
          this.listError.set(null);
          return this.service.list(query).pipe(
            catchError(err => {
              this.listError.set(curriculumErrorMessage(err, 'تعذر تحميل المناهج.'));
              return of(null);
            })
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe(result => {
        if (result) this.list.set(result);
        this.loadingList.set(false);
      });

    this.filesQuery
      .pipe(
        switchMap(query => {
          this.loadingFiles.set(true);
          this.filesError.set(null);
          return this.service.files(query.id, query).pipe(
            catchError(err => {
              this.filesError.set(curriculumErrorMessage(err, 'تعذر تحميل ملفات المنهج.'));
              return of(null);
            })
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe(result => {
        if (result) this.files.set(result);
        this.loadingFiles.set(false);
      });

    inject(DestroyRef).onDestroy(() => clearTimeout(this.searchTimer));
    this.loadList();
  }

  /** The teacher's subjects that have no curriculum yet (whatever page they're on). */
  readonly subjectsWithoutCurriculum = computed(() => {
    if (!this.scope.isTeacher() || !this.list()) return [];
    const started = new Set(this.list()!.startedSubjects);
    return this.scope.subjects().filter(s => !started.has(s));
  });

  /** The kinds the opened curriculum has files of, with how many. */
  readonly kindTabs = computed(() => {
    const counts = this.selected()?.fileCounts ?? {};
    return this.fileKinds.filter(kind => counts[kind.id]).map(kind => ({ ...kind, count: counts[kind.id]! }));
  });

  // ---------- The list ----------

  loadList(): void {
    this.listQuery.next({ page: this.page(), limit: this.pageSize(), search: this.search().trim(), gradeId: this.selectedGrade() });
  }

  selectGrade(gradeId: string): void {
    if (gradeId === this.selectedGrade()) return;
    this.selectedGrade.set(gradeId);
    this.page.set(1);
    this.loadList();
  }

  goToPage(page: number): void {
    this.page.set(page);
    this.loadList();
  }

  changePageSize(size: number): void {
    savePageSize(LIST_SIZE_KEY, size);
    this.pageSize.set(size);
    this.page.set(1);
    this.loadList();
  }

  onSearch(value: string): void {
    this.search.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page.set(1);
      this.loadList();
    }, SEARCH_DELAY_MS);
  }

  // ---------- One curriculum ----------

  open(id: string): void {
    this.selectedId.set(id);
    this.selected.set(null);
    this.pendingDelete.set(null);
    this.actionError.set(null);
    this.fileKind.set(null);
    this.filesPage.set(1);
    this.files.set(null);
    this.loadDetail();
    this.loadFiles();
  }

  back(): void {
    this.selectedId.set(null);
    this.selected.set(null);
    this.pendingDelete.set(null);
    this.actionError.set(null);
  }

  loadDetail(): void {
    const id = this.selectedId();
    if (!id) return;
    this.loadingDetail.set(true);
    this.detailError.set(null);
    this.service.get(id).subscribe({
      next: curriculum => {
        if (this.selectedId() === id) this.selected.set(curriculum);
        this.loadingDetail.set(false);
      },
      error: err => {
        this.detailError.set(curriculumErrorMessage(err, 'تعذر فتح المنهج.'));
        this.loadingDetail.set(false);
      }
    });
  }

  loadFiles(): void {
    const id = this.selectedId();
    if (id) this.filesQuery.next({ id, page: this.filesPage(), limit: this.filesPageSize(), kind: this.fileKind() });
  }

  selectKind(kind: CurriculumFileKind | null): void {
    if (kind === this.fileKind()) return;
    this.fileKind.set(kind);
    this.filesPage.set(1);
    this.loadFiles();
  }

  goToFilesPage(page: number): void {
    this.filesPage.set(page);
    this.loadFiles();
  }

  changeFilesPageSize(size: number): void {
    savePageSize(FILES_SIZE_KEY, size);
    this.filesPageSize.set(size);
    this.filesPage.set(1);
    this.loadFiles();
  }

  kindOf(id: CurriculumFileKind): (typeof CURRICULUM_FILE_KINDS)[number] | undefined {
    return this.fileKinds.find(kind => kind.id === id);
  }

  download(file: CurriculumFile): void {
    const curriculum = this.selected();
    if (!curriculum || !file.file) return;
    this.actionError.set(null);
    this.service.downloadFile(curriculum.id, file.id, file.file.name).subscribe({
      error: err => this.actionError.set(curriculumErrorMessage(err, 'تعذر تحميل الملف.'))
    });
  }

  downloadPlanFile(): void {
    const curriculum = this.selected();
    if (!curriculum?.planFile) return;
    this.actionError.set(null);
    this.service.downloadPlanFile(curriculum.id, curriculum.planFile.name).subscribe({
      error: err => this.actionError.set(curriculumErrorMessage(err, 'تعذر تحميل ملف الخطة.'))
    });
  }

  // ---------- Teacher actions ----------

  openForm(curriculum: Curriculum | null, subject = ''): void {
    this.saveError.set(null);
    this.editingCurriculum.set(curriculum);
    this.presetSubject.set(subject);
    this.formOpen.set(true);
  }

  openFileDialog(): void {
    this.saveError.set(null);
    this.fileDialogOpen.set(true);
  }

  openPlanDialog(): void {
    this.saveError.set(null);
    this.planDialogOpen.set(true);
  }

  saveCurriculum(draft: CurriculumDraft): void {
    const editing = this.editingCurriculum();
    const request$ = editing ? this.service.update(editing.id, draft) : this.service.create(draft);
    this.run(request$, curriculum => {
      this.formOpen.set(false);
      this.selectedId.set(curriculum.id);
      this.selected.set(curriculum);
      if (!editing) {
        this.fileKind.set(null);
        this.filesPage.set(1);
        this.loadFiles();
      }
      this.afterChange();
    }, 'تعذر حفظ المنهج.');
  }

  addFile(file: NewCurriculumFile): void {
    const curriculum = this.selected();
    if (!curriculum) return;
    this.run(this.service.addFile(curriculum.id, file), () => {
      this.fileDialogOpen.set(false);
      // Show the new file: its kind, first page (newest first)
      this.fileKind.set(this.fileKind() && this.fileKind() !== file.kind ? null : this.fileKind());
      this.filesPage.set(1);
      this.loadDetail();
      this.loadFiles();
      this.afterChange();
    }, 'تعذر رفع الملف.');
  }

  savePlan({ weeks, planFile }: CurriculumPlan): void {
    const curriculum = this.selected();
    if (!curriculum) return;
    // The weeks, then the plan document if it was changed
    const request$ = this.service.savePlan(curriculum.id, weeks).pipe(
      concatMap(saved =>
        planFile ? this.service.setPlanFile(curriculum.id, planFile) : planFile === null ? this.service.deletePlanFile(curriculum.id) : of(saved)
      )
    );
    this.run(request$, saved => {
      this.planDialogOpen.set(false);
      this.selected.set(saved);
      this.afterChange();
    }, 'تعذر حفظ الخطة.');
  }

  isPendingDelete(type: 'curriculum' | 'file', id: string): boolean {
    const pending = this.pendingDelete();
    return pending?.type === type && pending.id === id;
  }

  confirmDelete(): void {
    const pending = this.pendingDelete();
    const curriculum = this.selected();
    if (!pending || !curriculum || this.saving()) return;
    this.actionError.set(null);
    this.saving.set(true);
    const request$ =
      pending.type === 'curriculum' ? this.service.remove(curriculum.id) : this.service.deleteFile(curriculum.id, pending.id);
    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.pendingDelete.set(null);
        if (pending.type === 'curriculum') {
          this.back();
        } else {
          // The last file of a page: go back one page
          const shown = this.files();
          if (shown && shown.files.length === 1 && this.filesPage() > 1) this.filesPage.update(page => page - 1);
          this.loadDetail();
          this.loadFiles();
        }
        this.afterChange();
      },
      error: err => {
        this.saving.set(false);
        this.actionError.set(curriculumErrorMessage(err, 'تعذر الحذف.'));
      }
    });
  }

  // ---------- helpers ----------

  /** A dialog's request: the dialog stays open (and shows the error) if it fails. */
  private run<T>(request$: Observable<T>, done: (result: T) => void, fallback: string): void {
    this.saving.set(true);
    this.saveError.set(null);
    request$.subscribe({
      next: result => {
        this.saving.set(false);
        done(result);
      },
      error: err => {
        this.saving.set(false);
        this.saveError.set(curriculumErrorMessage(err, fallback));
      }
    });
  }

  /** The list (and the dashboards) show the change. */
  private afterChange(): void {
    this.store.invalidate();
    this.loadList();
  }
}
