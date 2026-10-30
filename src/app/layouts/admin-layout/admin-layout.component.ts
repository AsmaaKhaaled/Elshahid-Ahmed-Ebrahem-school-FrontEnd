import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { provideMaterialDefaults } from '../../shared/material/material-defaults.providers';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, NavbarComponent, SidebarComponent],
  providers: [provideMaterialDefaults()],
  template: `
    <div class="flex h-screen overflow-hidden bg-slate-50 font-cairo">
      <!-- Fixed (pinned) sidebar - always visible in the admin panel -->
      <app-sidebar
        [role]="'ADMIN'"
        [pinned]="true">
      </app-sidebar>

      <!-- Main Content Area -->
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <!-- Top Navigation Bar -->
        <app-navbar
          [title]="'لوحة تحكم إدارة المدرسة والكنترول'"
          [showSidebarToggle]="false">
        </app-navbar>

        <!-- Dynamic Feature Views -->
        <main class="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `
})
export class AdminLayoutComponent {}
