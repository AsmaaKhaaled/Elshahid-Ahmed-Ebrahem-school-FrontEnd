import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, of, switchMap } from 'rxjs';
import { PAGE_SIZE_OPTIONS, loadPageSize, savePageSize } from '../../shared/components/pagination/page-size';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { CardTableDirective } from '../../shared/directives/card-table.directive';
import { ClassStudentsPage, MyClass, myClassesErrorMessage } from './my-class.model';
import { MyClassesService } from './my-classes.service';

const PAGE_SIZE_KEY = 'my-class-students';
const SEARCH_DELAY_MS = 300;

interface StudentsQuery { classId: string; page: number; limit: number; search: string }

/** Teacher panel "فصولي": only the classes the admin assigned to this teacher, and their students. */
@Component({
  selector: 'app-my-classes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PaginationComponent, CardTableDirective],
  templateUrl: './my-classes.component.html'
})
export class MyClassesComponent {
  private readonly service = inject(MyClassesService);
  private readonly studentsQuery = new Subject<StudentsQuery>();
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
  readonly pageSize = signal(loadPageSize(PAGE_SIZE_KEY));

  readonly classes = signal<MyClass[]>([]);
  readonly loadingClasses = signal(true);
  readonly classesError = signal<string | null>(null);

  readonly selectedClassId = signal<string | null>(null);
  readonly page = signal(1);
  readonly search = signal('');
  readonly studentsPage = signal<ClassStudentsPage | null>(null);
  readonly loadingStudents = signal(false);
  readonly studentsError = signal<string | null>(null);

  readonly selectedClass = computed(() => this.classes().find(c => c.id === this.selectedClassId()) ?? null);
  readonly totalStudents = computed(() => this.classes().reduce((sum, c) => sum + c.studentCount, 0));

  constructor() {
    // switchMap drops the answer of an older request when the class / page / search changes quickly
    this.studentsQuery
      .pipe(
        switchMap(query => {
          this.loadingStudents.set(true);
          this.studentsError.set(null);
          return this.service.getStudents(query.classId, query.page, query.limit, query.search).pipe(
            catchError(err => {
              this.studentsError.set(myClassesErrorMessage(err, 'تعذر تحميل قائمة الطلاب.'));
              return of(null);
            })
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe(result => {
        if (result) this.studentsPage.set(result);
        this.loadingStudents.set(false);
      });

    inject(DestroyRef).onDestroy(() => clearTimeout(this.searchTimer));
    this.loadClasses();
  }

  loadClasses(): void {
    this.loadingClasses.set(true);
    this.classesError.set(null);
    this.service.getClasses().subscribe({
      next: classes => {
        this.classes.set(classes);
        this.loadingClasses.set(false);
        if (classes.length && !classes.some(c => c.id === this.selectedClassId())) {
          this.selectClass(classes[0].id);
        }
      },
      error: err => {
        this.classesError.set(myClassesErrorMessage(err, 'تعذر تحميل فصولك.'));
        this.loadingClasses.set(false);
      }
    });
  }

  selectClass(classId: string): void {
    if (classId === this.selectedClassId()) return;
    clearTimeout(this.searchTimer);
    this.selectedClassId.set(classId);
    this.search.set('');
    this.page.set(1);
    this.studentsPage.set(null);
    this.loadStudents();
  }

  goToPage(page: number): void {
    this.page.set(page);
    this.loadStudents();
  }

  changePageSize(size: number): void {
    savePageSize(PAGE_SIZE_KEY, size);
    this.pageSize.set(size);
    this.page.set(1);
    this.loadStudents();
  }

  onSearch(value: string): void {
    this.search.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page.set(1);
      this.loadStudents();
    }, SEARCH_DELAY_MS);
  }

  loadStudents(): void {
    const classId = this.selectedClassId();
    if (classId) {
      this.studentsQuery.next({ classId, page: this.page(), limit: this.pageSize(), search: this.search().trim() });
    }
  }

  density(cls: MyClass): number {
    return cls.capacity ? cls.studentCount / cls.capacity : 0;
  }

  // From the page that is shown, not the one being loaded
  rowNumber(index: number): number {
    const meta = this.studentsPage()?.meta;
    return meta ? (meta.page - 1) * meta.limit + index + 1 : index + 1;
  }
}
