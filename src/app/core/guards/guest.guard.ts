import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { TokenService } from '../auth/token.service';

/** Keeps signed-in users off the login page: they go straight to their own dashboard. */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const tokenService = inject(TokenService);
  const router = inject(Router);

  if (tokenService.hasTempToken() || authService.mustChangePassword() || !tokenService.hasValidToken()) {
    return true;
  }

  const role = authService.userRole();
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    return router.createUrlTree(['/admin/dashboard']);
  } else if (role === 'TEACHER') {
    return router.createUrlTree(['/teacher/dashboard']);
  } else if (role) {
    return router.createUrlTree(['/student/dashboard']);
  }
  return true;
};
