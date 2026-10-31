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

  return next(clonedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Clear session and redirect to login
        tokenService.clearTokens();
        router.navigate(['/auth/login'], {
          queryParams: { sessionExpired: 'true' }
        });
      }
      return throwError(() => error);
    })
  );
};

