import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { TokenService } from '../auth/token.service';

export const passwordChangeGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const tokenService = inject(TokenService);
  const router = inject(Router);

  // If user holds a valid tempToken or requires password change, permit entry
  if (tokenService.hasTempToken() || authService.mustChangePassword()) {
    return true;
  }

  // If user does not have any token, redirect to login
  if (!tokenService.hasValidToken()) {
    return router.createUrlTree(['/auth/login']);
  }

  // If user has a valid standard token and does not need password change, route to role dashboard
  const role = authService.userRole();
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    return router.createUrlTree(['/admin/dashboard']);
  } else if (role === 'TEACHER') {
    return router.createUrlTree(['/teacher/dashboard']);
  } else {
    return router.createUrlTree(['/student/dashboard']);
  }
};

