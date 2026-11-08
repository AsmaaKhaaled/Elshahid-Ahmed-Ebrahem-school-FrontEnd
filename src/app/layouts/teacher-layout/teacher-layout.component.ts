import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SchoolStructureStore } from '../../core/academic/school-structure.store';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { provideMaterialDefaults } from '../../shared/material/material-defaults.providers';

@Component({
  selector: 'app-teacher-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, NavbarComponent, SidebarComponent],
  providers: [provideMaterialDefaults()],
  templateUrl: './teacher-layout.component.html',
  styleUrl: './teacher-layout.component.css'
})
export class TeacherLayoutComponent {
  constructor() {
    // This year's classes per grade, used by every page that lists classes
    inject(SchoolStructureStore).ensureLoaded();
  }
}
