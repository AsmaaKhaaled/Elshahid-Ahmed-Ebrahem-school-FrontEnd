import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { TokenService } from '../auth/token.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let navigate: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  afterEach(() => TestBed.inject(TokenService).clearTokens());

  function answer401(): void {
    http.get('/api/v1/announcements').subscribe({ error: () => undefined });
    backend.expectOne('/api/v1/announcements').flush({}, { status: 401, statusText: 'Unauthorized' });
  }

  it('sends a signed-in user whose session expired back to the login page', () => {
    TestBed.inject(TokenService).setTokens('expired-token');
    answer401();
    expect(navigate).toHaveBeenCalledWith(['/'], { queryParams: { sessionExpired: 'true' } });
  });

  it('leaves a visitor on the public page when a request needs signing in', () => {
    answer401();
    expect(navigate).not.toHaveBeenCalled();
  });
});
