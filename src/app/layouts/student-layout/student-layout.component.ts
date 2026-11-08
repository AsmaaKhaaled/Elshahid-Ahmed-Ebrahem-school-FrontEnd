import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SchoolStructureStore } from '../../core/academic/school-structure.store';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { provideMaterialDefaults } from '../../shared/material/material-defaults.providers';

@Component({
  selector: 'app-student-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, NavbarComponent, SidebarComponent],
  providers: [provideMaterialDefaults()],
  templateUrl: './student-layout.component.html',
  styleUrl: './student-layout.component.css'
})
export class StudentLayoutComponent {
  constructor() {
    // This year's classes per grade, used by every page that lists classes
    inject(SchoolStructureStore).ensureLoaded();
  }
}
