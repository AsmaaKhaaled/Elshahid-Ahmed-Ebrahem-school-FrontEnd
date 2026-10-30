import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateChildFn, Router } from '@angular/router';
import { AdminRouteAccess } from '../admin/admin-permissions';
import { AuthService } from '../auth/auth.service';

/**
 * Admin child routes declare the section they belong to with `data: { access }`.
 * An admin who wasn't granted that section is sent back to the dashboard.
 * (UX guard only - the backend must enforce the same permissions on its endpoints.)
 */
export const adminSectionGuard: CanActivateChildFn = (childRoute: ActivatedRouteSnapshot) => {
  const access = childRoute.data['access'] as AdminRouteAccess | undefined;
  if (!access || inject(AuthService).canAccessAdminSection(access)) {
    return true;
  }
  return inject(Router).createUrlTree(['/admin/dashboard']);
};
