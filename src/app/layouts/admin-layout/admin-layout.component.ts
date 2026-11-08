import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SchoolStructureStore } from '../../core/academic/school-structure.store';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { provideMaterialDefaults } from '../../shared/material/material-defaults.providers';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, NavbarComponent, SidebarComponent],
  providers: [provideMaterialDefaults()],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css'
})
export class AdminLayoutComponent {
  constructor() {
    // This year's classes per grade, used by every page that lists classes
    inject(SchoolStructureStore).ensureLoaded();
  }
}
