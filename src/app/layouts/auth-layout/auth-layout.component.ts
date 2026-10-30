import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AcademicCalendarStore } from '../../core/academic/academic-calendar.store';
import { SCHOOL_INFO } from '../../core/constants/school.constants';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.css'
})
export class AuthLayoutComponent {
  readonly school = SCHOOL_INFO;
  readonly academicYear = inject(AcademicCalendarStore).currentYear;
  readonly currentYear = new Date().getFullYear();
}
