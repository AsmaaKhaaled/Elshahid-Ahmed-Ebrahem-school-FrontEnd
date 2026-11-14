import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { loginAs, provideTestDefaults } from '../../../testing/test-helpers';
import { Material } from '../teaching/teaching.model';
import { MaterialsComponent } from './materials.component';

const API = 'http://localhost:5000/api/v1/materials';

const material = (id: string, extra: object = {}) => ({
  id, title: `مادة ${id}`, description: '', subject: 'الرياضيات', teacherId: 't1', teacherName: 'أ. أحمد',
  sections: ['3/2'], files: [{ id: `${id}-f1`, name: 'ملخص.pdf', size: 1024, type: 'application/pdf' }], link: null,
  publishedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...extra
});
const meta = (total: number, page = 1, limit = 15) => ({ total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });

describe('MaterialsComponent', () => {
  let component: MaterialsComponent;
  let fixture: ComponentFixture<MaterialsComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.removeItem('sch_page_size:materials');
    await TestBed.configureTestingModule({
      imports: [MaterialsComponent],
      providers: provideTestDefaults()
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => localStorage.removeItem('sch_user_profile'));

  function create(): void {
    fixture = TestBed.createComponent(MaterialsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  const listRequest = (): TestRequest => http.expectOne(req => req.url === API && req.method === 'GET');
  const flushList = (materials: object[], subjects = [{ subject: 'الرياضيات', count: materials.length }]) => {
    listRequest().flush({ data: { materials, subjects }, meta: meta(materials.length) });
    fixture.detectChanges();
  };

  it('shows a student the materials the API sends for their class, with the files to download', () => {
    loginAs('STUDENT');
    create();
    flushList([material('m1', { link: 'https://www.youtube.com/watch?v=x' })]);

    expect(component.materials().length).toBe(1);
    expect(component.materials()[0].files[0].download).toBeDefined();
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('مادة m1');
    expect(text).toContain('أ. أحمد');
    expect(text).toContain('فتح الرابط');
    // A student can't publish
    expect(text).not.toContain('رفع مادة تعليمية');
  });

  it('builds the subject tabs from the server counts and asks the server for one subject', () => {
    loginAs('STUDENT');
    create();
    flushList([material('m1'), material('m2', { subject: 'العلوم' })], [
      { subject: 'الرياضيات', count: 4 },
      { subject: 'العلوم', count: 2 }
    ]);
    expect(component.subjectTabs()).toEqual([
      { id: 'الكل', count: 6 },
      { id: 'الرياضيات', count: 4 },
      { id: 'العلوم', count: 2 }
    ]);

    component.selectSubject('العلوم');
    const req = listRequest();
    expect(req.request.params.get('subject')).toBe('العلوم');
    expect(req.request.params.get('page')).toBe('1');
  });

  it('publishes a teacher material as one multipart request with its classes and files, then reloads', () => {
    loginAs('TEACHER');
    create();
    flushList([]);

    const picked = new File(['pdf'], 'ملخص.pdf', { type: 'application/pdf' });
    const draft: Material = {
      id: 'tmp', title: 'ملخص الوحدة', description: 'للمراجعة', subject: 'الرياضيات', teacherId: 't1',
      sections: ['3/2', '3/3'], files: [{ name: picked.name, size: picked.size, url: '', blob: picked }],
      link: undefined, publishedAt: ''
    };
    component.openForm(null);
    component.saveMaterial(draft);

    const post = http.expectOne(req => req.url === API && req.method === 'POST');
    const body = post.request.body as FormData;
    expect(body.get('title')).toBe('ملخص الوحدة');
    expect(body.getAll('sections')).toEqual(['3/2', '3/3']);
    expect((body.get('files') as File).name).toBe('ملخص.pdf');
    expect(body.get('link')).toBe('');
    post.flush({ data: { material: material('new') } }, { status: 201, statusText: 'Created' });

    flushList([material('new')]);
    expect(component.formOpen()).toBeFalse();
    expect(component.materials()[0].id).toBe('new');
  });

  it('keeps the files still listed when a teacher edits a material', () => {
    loginAs('TEACHER');
    create();
    flushList([material('m1')]);

    const existing = component.materials()[0];
    component.openForm(existing);
    component.saveMaterial({ ...existing, title: 'معدّل' });

    const put = http.expectOne(`${API}/m1`);
    expect(put.request.method).toBe('PUT');
    const body = put.request.body as FormData;
    expect(body.getAll('keepFileIds')).toEqual(['m1-f1']);
    expect(body.get('files')).toBeNull();
  });

  it('keeps the dialog open when saving fails', () => {
    loginAs('TEACHER');
    create();
    flushList([]);

    component.openForm(null);
    component.saveMaterial({
      id: '', title: 'x', description: '', subject: 'الرياضيات', teacherId: 't1', sections: ['1/1'], files: [],
      link: 'https://example.com', publishedAt: ''
    });
    http.expectOne(req => req.method === 'POST').flush({ message: 'هذه الفصول ليست من فصولك في هذه المادة: 1/1' }, { status: 400, statusText: 'Bad Request' });

    expect(component.formOpen()).toBeTrue();
    expect(component.saving()).toBeFalse();
  });

  it('says what went wrong when the list cannot be loaded', () => {
    loginAs('STUDENT');
    create();
    listRequest().flush({ message: 'Server error' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(component.listError()).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('إعادة المحاولة');
  });
});
