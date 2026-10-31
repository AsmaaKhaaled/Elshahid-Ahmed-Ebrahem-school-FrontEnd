import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

/**
 * Smart role-based router guard for top-level shortcuts (e.g. /exams, /grades, /subjects).
 * 
 * Behavior:
 * 1. If unauthenticated: redirects to /auth/login with the intended returnUrl.
 * 2. If authenticated: routes to the user's role-specific feature path:
 *    - STUDENT / PARENT -> /student/{feature}
 *    - TEACHER -> /teacher/{feature}
 *    - ADMIN / SUPER_ADMIN -> /admin/{feature}
 */
export const featureRedirectGuard = (feature: string): CanActivateFn => (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/'], {
      queryParams: { returnUrl: state.url }
    });
  }

  const role = authService.userRole();

  switch (feature) {
    case 'dashboard':
      if (role === 'TEACHER') return router.createUrlTree(['/teacher/dashboard']);
      if (role === 'STUDENT' || role === 'PARENT') return router.createUrlTree(['/student/dashboard']);
      return router.createUrlTree(['/admin/dashboard']);

    case 'subjects':
      if (role === 'TEACHER') return router.createUrlTree(['/teacher/subjects']);
      if (role === 'STUDENT' || role === 'PARENT') return router.createUrlTree(['/student/lessons']);
      return router.createUrlTree(['/admin/dashboard']);

    case 'lessons':
      if (role === 'TEACHER') return router.createUrlTree(['/teacher/lessons']);
      if (role === 'STUDENT' || role === 'PARENT') return router.createUrlTree(['/student/lessons']);
      return router.createUrlTree(['/admin/classes']);

    case 'exams':
      if (role === 'TEACHER') return router.createUrlTree(['/teacher/exams']);
      if (role === 'STUDENT' || role === 'PARENT') return router.createUrlTree(['/student/exams']);
      return router.createUrlTree(['/admin/exams']);

    case 'grades':
      if (role === 'TEACHER') return router.createUrlTree(['/teacher/grades']);
      if (role === 'STUDENT' || role === 'PARENT') return router.createUrlTree(['/student/grades']);
      return router.createUrlTree(['/admin/dashboard']);

    case 'announcements':
      if (role === 'TEACHER') return router.createUrlTree(['/teacher/announcements']);
      if (role === 'STUDENT' || role === 'PARENT') return router.createUrlTree(['/student/announcements']);
      return router.createUrlTree(['/admin/announcements']);

    case 'classes':
      if (role === 'TEACHER') return router.createUrlTree(['/teacher/classes']);
      if (role === 'ADMIN' || role === 'SUPER_ADMIN') return router.createUrlTree(['/admin/classes']);
      return router.createUrlTree(['/student/dashboard']);

    case 'assignments':
      if (role === 'TEACHER') return router.createUrlTree(['/teacher/assignments']);
      if (role === 'STUDENT' || role === 'PARENT') return router.createUrlTree(['/student/assignments']);
      return router.createUrlTree(['/admin/assignments']);

    case 'students':
      if (role === 'ADMIN' || role === 'SUPER_ADMIN') return router.createUrlTree(['/admin/students']);
      return router.createUrlTree(['/']);

    case 'teachers':
      if (role === 'ADMIN' || role === 'SUPER_ADMIN') return router.createUrlTree(['/admin/teachers']);
      return router.createUrlTree(['/']);

    case 'attendance-stats':
      if (role === 'ADMIN' || role === 'SUPER_ADMIN') return router.createUrlTree(['/admin/attendance-stats']);
      if (role === 'TEACHER') return router.createUrlTree(['/teacher/attendance']);
      return router.createUrlTree(['/student/attendance']);

    default:
      return router.createUrlTree(['/']);
  }
};

