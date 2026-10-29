import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, SidebarComponent],
  template: `
    <div class="flex h-screen overflow-hidden bg-slate-50 font-cairo">
      <!-- Sidebar with 2-way Signal Model Binding -->
      <app-sidebar 
        [role]="'ADMIN'" 
        [(isCollapsed)]="isSidebarCollapsed">
      </app-sidebar>

      <!-- Main Content Area -->
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <!-- Top Navigation Bar -->
        <app-navbar 
          [title]="'لوحة تحكم إدارة المدرسة والكنترول'" 
          (toggleSidebar)="toggleSidebar()">
        </app-navbar>

        <!-- Dynamic Feature Views -->
        <main class="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `
})
export class AdminLayoutComponent {
  readonly isSidebarCollapsed = signal<boolean>(false);

  toggleSidebar(): void {
    this.isSidebarCollapsed.update(state => !state);
  }
}

