import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { UserRole } from '../models/user.model';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const allowedRoles = route.data['roles'] as UserRole[] | undefined;
  const currentRole = authService.userRole();

  if (!currentRole) {
    return router.createUrlTree(['/']);
  }

  if (allowedRoles && !allowedRoles.includes(currentRole)) {
    // Redirect user to their own permitted dashboard
    if (currentRole === 'ADMIN' || currentRole === 'SUPER_ADMIN') {
      return router.createUrlTree(['/admin/dashboard']);
    } else if (currentRole === 'TEACHER') {
      return router.createUrlTree(['/teacher/dashboard']);
    } else {
      return router.createUrlTree(['/student/dashboard']);
    }
  }

  return true;
};

