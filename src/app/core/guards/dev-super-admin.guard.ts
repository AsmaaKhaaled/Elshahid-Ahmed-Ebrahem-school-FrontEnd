import { inject, isDevMode } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { TokenService } from '../auth/token.service';

/**
 * Development only: the admin panel opens directly as the SUPER_ADMIN, without a login.
 * Runs before authGuard on /admin. An existing session (e.g. a limited admin) is kept as is.
 * In production builds it does nothing, so the admin login stays mandatory.
 */
export const devSuperAdminGuard: CanActivateFn = () => {
  if (isDevMode() && !inject(TokenService).hasValidToken()) {
    inject(AuthService).startDevSuperAdminSession();
  }
  return true;
};

/**
 * Development only: /auth/admin skips the login form and opens the admin panel.
 * Add ?manual to the URL to still use the form (e.g. to try a limited admin's account).
 */
export const skipAdminLoginInDevGuard: CanActivateFn = route => {
  if (!isDevMode() || route.queryParamMap.has('manual')) {
    return true;
  }
  return inject(Router).createUrlTree(['/admin/dashboard']);
};
