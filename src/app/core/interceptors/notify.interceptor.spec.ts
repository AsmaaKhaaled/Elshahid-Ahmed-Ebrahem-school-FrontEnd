import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TokenService } from '../auth/token.service';
import { ToastService } from '../notifications/toast.service';
import { SUCCESS_MESSAGE, notifyInterceptor } from './notify.interceptor';

describe('notifyInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let toasts: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([notifyInterceptor])), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    toasts = TestBed.inject(ToastService);
  });

  afterEach(() => TestBed.inject(TokenService).clearTokens());

  const shown = () => toasts.toasts().map(t => [t.kind, t.message]);
  const ignore = { error: () => undefined };

  it('confirms a save, in the backend’s words when they are Arabic', () => {
    http.post('/api/v1/teachers', {}).subscribe();
    backend.expectOne('/api/v1/teachers').flush({ message: 'Teacher created successfully' });
    http.delete('/api/v1/announcements/1').subscribe();
    backend.expectOne('/api/v1/announcements/1').flush({ message: 'تم حذف الإعلان بنجاح' });

    expect(shown()).toEqual([['success', 'تم الحفظ بنجاح.'], ['success', 'تم حذف الإعلان بنجاح']]);
  });

  it('says what went wrong with a save', () => {
    http.put('/api/v1/teachers/1', {}).subscribe(ignore);
    backend.expectOne('/api/v1/teachers/1').flush(
      { message: 'Validation failed', errors: [{ field: 'nationalId', message: 'الرقم القومي مسجل لمعلم آخر' }] },
      { status: 422, statusText: 'Unprocessable' }
    );
    http.patch('/api/v1/admin/admins/1', {}).subscribe(ignore);
    backend.expectOne('/api/v1/admin/admins/1').flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(shown()).toEqual([['error', 'الرقم القومي مسجل لمعلم آخر'], ['error', 'ليس لديك صلاحية لتنفيذ هذا الإجراء.']]);
  });

  it('stays quiet while loading data, unless the server is down', () => {
    http.get('/api/v1/teachers').subscribe(ignore);
    backend.expectOne('/api/v1/teachers').flush({}, { status: 404, statusText: 'Not Found' });
    expect(shown()).toEqual([]);

    http.get('/api/v1/teachers').subscribe(ignore);
    backend.expectOne('/api/v1/teachers').error(new ProgressEvent('error'));
    expect(shown()).toEqual([['error', 'تعذر الاتصال بالخادم. تأكد من اتصال الإنترنت وحاول مرة أخرى.']]);
  });

  it('leaves a visitor alone, but tells a signed-in user their session expired', () => {
    http.get('/api/v1/announcements').subscribe(ignore);
    backend.expectOne('/api/v1/announcements').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(shown()).toEqual([]);

    TestBed.inject(TokenService).setTokens('expired');
    http.get('/api/v1/announcements').subscribe(ignore);
    backend.expectOne('/api/v1/announcements').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(shown()).toEqual([['error', 'انتهت جلستك. سجّل الدخول مرة أخرى.']]);
  });

  it('skips background requests, sign-in, and pages that word their own message', () => {
    http.post('/api/v1/announcements/1/read', {}).subscribe();
    backend.expectOne('/api/v1/announcements/1/read').flush({});
    http.post('/api/v1/auth/login', {}).subscribe(ignore);
    backend.expectOne('/api/v1/auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });
    http.patch('/api/v1/auth/me', {}, { context: new HttpContext().set(SUCCESS_MESSAGE, '') }).subscribe();
    backend.expectOne('/api/v1/auth/me').flush({});

    expect(shown()).toEqual([]);
  });
});
