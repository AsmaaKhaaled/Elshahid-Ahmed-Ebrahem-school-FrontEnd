import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { TokenService } from '../auth/token.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const tokenService = inject(TokenService);
  const router = inject(Router);

  // If user only holds a temporary token or must change password, strictly block access to dashboards
  if (tokenService.hasTempToken() || authService.mustChangePassword()) {
    if (!state.url.includes('/auth/set-initial-password')) {
      return router.createUrlTree(['/auth/set-initial-password']);
    }
  }

  if (!tokenService.hasValidToken()) {
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url }
    });
  }

  return true;
};

