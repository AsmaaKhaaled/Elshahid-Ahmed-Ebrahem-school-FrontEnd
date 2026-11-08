import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { loginAs, provideTestDefaults } from '../../../testing/test-helpers';
import { CurriculumComponent } from './curriculum.component';

const API = 'http://localhost:5000/api/v1/curricula';

const summary = (id: string, extra: object = {}) => ({
  id, teacherId: 't1', teacherName: 'أ. أحمد', subject: 'الرياضيات', gradeId: 'G3', sections: ['3/2'], description: '',
  updatedAt: new Date().toISOString(), fileCount: 2, kinds: ['BOOK', 'OTHER'], latestFile: null, ...extra
});
const detail = (id: string, extra: object = {}) => ({
  ...summary(id), fileCounts: { BOOK: 1, OTHER: 1 }, plan: [], planFile: null, ...extra
});
const meta = (total: number, page = 1, limit = 15) => ({ total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
const file = (id: string, kind = 'BOOK') => ({
  id, kind, title: `ملف ${id}`, forStudents: true, link: null, file: { name: `${id}.pdf`, size: 1024, type: 'application/pdf' },
  uploadedAt: new Date().toISOString()
});

describe('CurriculumComponent', () => {
  let component: CurriculumComponent;
  let fixture: ComponentFixture<CurriculumComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.removeItem('sch_page_size:curricula');
    localStorage.removeItem('sch_page_size:curriculum-files');
    await TestBed.configureTestingModule({
      imports: [CurriculumComponent],
      providers: provideTestDefaults()
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    localStorage.removeItem('sch_user_profile');
    localStorage.removeItem('sch_page_size:curricula');
    localStorage.removeItem('sch_page_size:curriculum-files');
  });

  function create(): void {
    fixture = TestBed.createComponent(CurriculumComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  const listRequest = (): TestRequest => http.expectOne(req => req.url === API && req.method === 'GET');
  const flushList = (curricula: object[], total = curricula.length, startedSubjects?: string[]) => {
    listRequest().flush({ data: { curricula, ...(startedSubjects && { startedSubjects }) }, meta: meta(total) });
    fixture.detectChanges();
  };

  /** Opens a curriculum and answers its detail & first files page */
  function openCurriculum(id: string, files: object[], extra: object = {}): void {
    component.open(id);
    http.expectOne(`${API}/${id}`).flush({ data: { curriculum: detail(id, extra) } });
    http.expectOne(req => req.url === `${API}/${id}/files`).flush({ data: { files }, meta: meta(files.length) });
    fixture.detectChanges();
  }

  it('asks the server for one page of 15 and shows the pages', () => {
    loginAs('SUPER_ADMIN');
    create();
    const req = listRequest();
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('15');
    req.flush({ data: { curricula: [summary('a'), summary('b')] }, meta: meta(40) });
    fixture.detectChanges();

    expect(component.curricula().map(c => c.id)).toEqual(['a', 'b']);
    expect(component.curricula()[0].kinds).toEqual(['book', 'other']);
    expect(fixture.nativeElement.textContent).toContain('عرض 1–15 من 40');

    component.goToPage(2);
    expect(listRequest().request.params.get('page')).toBe('2');
  });

  it('remembers the page size and starts again from page 1', () => {
    loginAs('SUPER_ADMIN');
    create();
    flushList([summary('a')], 40);
    component.goToPage(2);
    flushList([summary('b')], 40);

    component.changePageSize(50);
    const req = listRequest();
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('50');
    expect(localStorage.getItem('sch_page_size:curricula')).toBe('50');
  });

  it('lets the administration search every teacher\'s curricula', async () => {
    loginAs('SUPER_ADMIN');
    create();
    flushList([]);
    expect(component.showSearch()).toBeTrue();
    component.onSearch('رياضيات');
    await new Promise(resolve => setTimeout(resolve, 350));
    const req = listRequest();
    expect(req.request.params.get('search')).toBe('رياضيات');
    expect(req.request.params.get('page')).toBe('1');
  });

  it('splits the administration\'s curricula by grade', () => {
    loginAs('SUPER_ADMIN');
    create();
    listRequest().flush({
      data: { curricula: [summary('a', { gradeId: 'G1' }), summary('b', { gradeId: 'G3' })], gradeCounts: { G1: 4, G3: 5 } },
      meta: meta(9)
    });
    fixture.detectChanges();

    // Every grade: each grade's curricula under its heading, with a tab per grade
    expect(component.gradeTabs().map(t => t.count)).toEqual([9, 4, 0, 5]);
    expect(component.curriculaByGrade().map(g => g.grade.id)).toEqual(['G1', 'G3']);
    expect(fixture.nativeElement.textContent).toContain('الصف الأول الإعدادي');

    // One grade: the server filters it, from the first page
    component.goToPage(2);
    listRequest().flush({ data: { curricula: [] }, meta: meta(9, 2) });
    component.selectGrade('G3');
    const req = listRequest();
    expect(req.request.params.get('gradeId')).toBe('G3');
    expect(req.request.params.get('page')).toBe('1');
  });

  it('gives the teacher their lesson materials as a second tab (not the administration)', () => {
    loginAs('TEACHER');
    create();
    flushList([summary('c1')]);
    const tabs = () => fixture.nativeElement.querySelectorAll('[role="tablist"][aria-label="المحتوى"] [role="tab"]');
    expect(tabs().length).toBe(2);

    component.selectView('materials');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-materials')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('المواد التعليمية والملفات');

    component.selectView('curricula');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-materials')).toBeNull();
  });

  it('shows no content tabs to the administration', () => {
    loginAs('SUPER_ADMIN');
    create();
    flushList([]);
    expect(fixture.nativeElement.querySelector('[role="tablist"][aria-label="المحتوى"]')).toBeNull();
  });

  it("offers the teacher's subjects that have no curriculum yet, whatever page they're on", () => {
    loginAs('TEACHER');
    create();
    const [first, ...rest] = component.scope.subjects();
    flushList([], 0, [first]);
    expect(component.subjectsWithoutCurriculum()).toEqual(rest);
  });

  it('pages the files of a curriculum, one kind at a time', () => {
    loginAs('TEACHER');
    create();
    flushList([summary('c1')]);
    openCurriculum('c1', [file('f1'), file('f2', 'OTHER')]);

    expect(component.kindTabs().map(t => t.id)).toEqual(['book', 'other']);
    component.selectKind('other');
    const req = http.expectOne(r => r.url === `${API}/c1/files`);
    expect(req.request.params.get('kind')).toBe('OTHER');
    expect(req.request.params.get('page')).toBe('1');
    req.flush({ data: { files: [file('f2', 'OTHER')] }, meta: meta(1) });
    expect(component.files()!.files.map(f => f.id)).toEqual(['f2']);
  });

  it('uploads a file as form data and shows it', () => {
    loginAs('TEACHER');
    create();
    flushList([summary('c1')]);
    openCurriculum('c1', []);

    const picked = new File(['%PDF'], 'كتاب.pdf', { type: 'application/pdf' });
    component.addFile({ kind: 'book', title: 'كتاب الوزارة', forStudents: true, file: picked });
    const upload = http.expectOne(`${API}/c1/files`);
    expect(upload.request.method).toBe('POST');
    const body = upload.request.body as FormData;
    expect(body.get('kind')).toBe('BOOK');
    expect(body.get('forStudents')).toBe('true');
    expect((body.get('file') as File).name).toBe('كتاب.pdf');
    expect(component.saving()).toBeTrue();
    upload.flush({ data: { file: file('new') } }, { status: 201, statusText: 'Created' });

    expect(component.saving()).toBeFalse();
    http.expectOne(`${API}/c1`).flush({ data: { curriculum: detail('c1', { fileCount: 1, fileCounts: { BOOK: 1 } }) } });
    http.expectOne(r => r.url === `${API}/c1/files`).flush({ data: { files: [file('new')] }, meta: meta(1) });
    flushList([summary('c1')]);
    expect(component.files()!.files.map(f => f.id)).toEqual(['new']);
  });

  it('keeps the dialog open with the server message when saving fails', () => {
    loginAs('TEACHER');
    create();
    flushList([]);
    component.openForm(null);
    component.saveCurriculum({ subject: 'الرياضيات', gradeId: 'G3', sections: ['3/2'], description: '' });
    http.expectOne(r => r.url === API && r.method === 'POST')
      .flush({ message: 'عندك منهج للمادة دي في الصف ده بالفعل' }, { status: 409, statusText: 'Conflict' });

    expect(component.formOpen()).toBeTrue();
    expect(component.saveError()).toBe('عندك منهج للمادة دي في الصف ده بالفعل');
  });

  it('saves the plan, then the plan document', () => {
    loginAs('TEACHER');
    create();
    flushList([summary('c1')]);
    openCurriculum('c1', []);

    const doc = new File(['x'], 'خطة.docx');
    component.savePlan({ weeks: [{ topic: 'المعادلات', objectives: ['يحل المعادلة'] }], planFile: doc });
    const plan = http.expectOne(`${API}/c1/plan`);
    expect(plan.request.body).toEqual({ weeks: [{ topic: 'المعادلات', objectives: ['يحل المعادلة'] }] });
    plan.flush({ data: { curriculum: detail('c1') } });
    const upload = http.expectOne(`${API}/c1/plan-file`);
    expect(upload.request.method).toBe('PUT');
    upload.flush({ data: { curriculum: detail('c1', { planFile: { name: 'خطة.docx', size: 1, type: null } }) } });
    flushList([summary('c1')]);

    expect(component.planDialogOpen()).toBeFalse();
    expect(component.selected()!.planFile!.name).toBe('خطة.docx');
  });

  it('never shows the plan to students', () => {
    loginAs('STUDENT');
    create();
    flushList([summary('c1')]);
    expect(component.showPlan()).toBeFalse();
    expect(component.showSearch()).toBeFalse();
    expect(component.subjectsWithoutCurriculum()).toEqual([]);
  });

  it('goes back one page after deleting the last file of a page', () => {
    loginAs('TEACHER');
    create();
    flushList([summary('c1')]);
    openCurriculum('c1', [file('f1')]);
    component.goToFilesPage(2);
    http.expectOne(r => r.url === `${API}/c1/files`).flush({ data: { files: [file('f16')] }, meta: meta(16, 2) });

    component.pendingDelete.set({ type: 'file', id: 'f16' });
    component.confirmDelete();
    http.expectOne(`${API}/c1/files/f16`).flush({ data: null });
    expect(component.filesPage()).toBe(1);
    http.expectOne(`${API}/c1`).flush({ data: { curriculum: detail('c1') } });
    expect(http.expectOne(r => r.url === `${API}/c1/files`).request.params.get('page')).toBe('1');
  });
});
