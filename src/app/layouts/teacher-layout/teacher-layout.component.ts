import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';

@Component({
  selector: 'app-teacher-layout',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, SidebarComponent],
  template: `
    <div class="flex h-screen overflow-hidden bg-slate-50 font-cairo">
      <app-sidebar 
        [role]="'TEACHER'" 
        [(isCollapsed)]="isSidebarCollapsed">
      </app-sidebar>

      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <app-navbar 
          [title]="'بوابة المعلم - إدارة الفصول والمناهج'" 
          (toggleSidebar)="toggleSidebar()">
        </app-navbar>

        <main class="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `
})
export class TeacherLayoutComponent {
  readonly isSidebarCollapsed = signal<boolean>(false);

  toggleSidebar(): void {
    this.isSidebarCollapsed.update(state => !state);
  }
}

