import { Directive, TemplateRef, ViewContainerRef, inject, input, effect } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { UserRole } from '../../core/models/user.model';

@Directive({
  selector: '[appHasRole]',
  standalone: true
})
export class HasRoleDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly authService = inject(AuthService);

  readonly roles = input.required<UserRole | UserRole[]>({ alias: 'appHasRole' });

  private hasView = false;

  constructor() {
    effect(() => {
      const allowedRoles = this.roles();
      const currentRole = this.authService.userRole();

      const isAllowed = currentRole && (
        Array.isArray(allowedRoles)
          ? allowedRoles.includes(currentRole)
          : allowedRoles === currentRole
      );

      if (isAllowed && !this.hasView) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.hasView = true;
      } else if (!isAllowed && this.hasView) {
        this.viewContainer.clear();
        this.hasView = false;
      }
    });
  }
}

