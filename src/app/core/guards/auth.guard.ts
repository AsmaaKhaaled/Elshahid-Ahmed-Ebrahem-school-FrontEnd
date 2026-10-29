import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { TokenService } from '../auth/token.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const tokenService = inject(TokenService);
  const router = inject(Router);

  if (!tokenService.hasValidToken()) {
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url }
    });
  }

  // If user must change their initial password, redirect them to set-initial-password
  if (authService.mustChangePassword() && !state.url.includes('/auth/set-initial-password')) {
    return router.createUrlTree(['/auth/set-initial-password']);
  }

  return true;
};

