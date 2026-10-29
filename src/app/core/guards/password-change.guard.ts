import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { TokenService } from '../auth/token.service';

export const passwordChangeGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const tokenService = inject(TokenService);
  const router = inject(Router);

  if (!tokenService.hasValidToken()) {
    return router.createUrlTree(['/auth/login']);
  }

  // If user does not need to change password, redirect to dashboard
  if (!authService.mustChangePassword()) {
    const role = authService.userRole();
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      return router.createUrlTree(['/admin/dashboard']);
    } else if (role === 'TEACHER') {
      return router.createUrlTree(['/teacher/dashboard']);
    } else {
      return router.createUrlTree(['/student/dashboard']);
    }
  }

  return true;
};

