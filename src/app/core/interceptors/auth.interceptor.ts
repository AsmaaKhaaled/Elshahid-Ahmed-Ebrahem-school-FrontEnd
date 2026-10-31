import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { TokenService } from '../auth/token.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  const isSetInitialPassword = req.url.includes('auth/set-initial-password');
  const tempToken = tokenService.getTempToken();
  const token = tokenService.getToken();
  const activeToken = isSetInitialPassword ? (tempToken || token) : token;

  let clonedRequest = req.clone({
    setHeaders: {
      'Accept-Language': 'ar',
      'X-Requested-With': 'XMLHttpRequest'
    }
  });

  if (activeToken) {
    clonedRequest = clonedRequest.clone({
      setHeaders: {
        Authorization: `Bearer ${activeToken}`
      }
    });
  }

  // A 401 from the login call itself means wrong credentials - the login page handles it
  const isLoginRequest = req.url.includes('auth/login');

  return next(clonedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isLoginRequest) {
        // Clear session and redirect to the matching login page
        tokenService.clearTokens();
        const loginPage = router.url.startsWith('/admin') ? '/auth/admin' : '/auth/login';
        router.navigate([loginPage], {
          queryParams: { sessionExpired: 'true' }
        });
      }
      return throwError(() => error);
    })
  );
};

