import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { passwordChangeGuard } from './core/guards/password-change.guard';
import { adminSectionGuard } from './core/guards/admin-section.guard';
import { SUPER_ADMIN_ONLY } from './core/admin/admin-permissions';

export const routes: Routes = [
  // Home Page
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent),
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent)
  },

  // Authentication Routes
  {
    path: 'auth',
    loadComponent: () => import('./layouts/auth-layout/auth-layout.component').then(m => m.AuthLayoutComponent),
    children: [
      { 
        path: 'login', 
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
      },
      // School administration login - reached from the small "دخول الإدارة" link, not advertised on the home page
      {
        path: 'admin',
        loadComponent: () => import('./features/auth/admin-login/admin-login.component').then(m => m.AdminLoginComponent)
      },
      {
        path: 'set-initial-password', 
        loadComponent: () => import('./features/auth/set-initial-password/set-initial-password.component').then(m => m.SetInitialPasswordComponent),
        canActivate: [passwordChangeGuard]
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },

  // Admin & School Leadership Layout & Routes
  {
    path: 'admin',
    loadComponent: () => import('./layouts/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [authGuard, roleGuard],
    // Each section declares its permission in data.access (see core/admin/admin-permissions.ts)
    canActivateChild: [adminSectionGuard],
    data: { roles: ['ADMIN', 'SUPER_ADMIN'] },
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'students', data: { access: 'students' }, loadComponent: () => import('./features/students/students.component').then(m => m.StudentsComponent) },
      { path: 'teachers', data: { access: 'teachers' }, loadComponent: () => import('./features/teachers/teachers.component').then(m => m.TeachersComponent) },
      { path: 'classes', data: { access: 'classes' }, loadComponent: () => import('./features/classes/classes.component').then(m => m.ClassesComponent) },
      // Temporarily disabled for admins (see the sidebar's disabledFor) - restore the loadComponent to re-enable
      { path: 'subjects', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'assignments', data: { access: 'assignments' }, loadComponent: () => import('./features/assignments/assignments.component').then(m => m.AssignmentsComponent) },
      { path: 'exams', data: { access: 'exams' }, loadComponent: () => import('./features/exams/exams.component').then(m => m.ExamsComponent) },
      { path: 'attendance-stats', data: { access: 'attendance-stats' }, loadComponent: () => import('./features/attendance-stats/attendance-stats.component').then(m => m.AttendanceStatsComponent) },
      { path: 'teacher-attendance', data: { access: 'teacher-attendance' }, loadComponent: () => import('./features/teacher-attendance/teacher-attendance.component').then(m => m.TeacherAttendanceComponent) },
      { path: 'academic-year', data: { access: 'academic-year' }, loadComponent: () => import('./features/academic-settings/academic-settings.component').then(m => m.AcademicSettingsComponent) },
      { path: 'platform-activity', data: { access: 'platform-activity' }, loadComponent: () => import('./features/platform-activity/platform-activity.component').then(m => m.PlatformActivityComponent) },
      { path: 'honor-roll', data: { access: 'honor-roll' }, loadComponent: () => import('./features/honor-roll/honor-roll.component').then(m => m.HonorRollComponent) },
      { path: 'admins', data: { access: SUPER_ADMIN_ONLY }, loadComponent: () => import('./features/admins/admins.component').then(m => m.AdminsComponent) },
      // Temporarily disabled for admins (see the sidebar's disabledFor) - restore the loadComponent to re-enable
      { path: 'grades', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'announcements', data: { access: 'announcements' }, loadComponent: () => import('./features/announcements/announcements.component').then(m => m.AnnouncementsComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // Teachers Layout & Routes
  {
    path: 'teacher',
    loadComponent: () => import('./layouts/teacher-layout/teacher-layout.component').then(m => m.TeacherLayoutComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['TEACHER'] },
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'classes', loadComponent: () => import('./features/classes/classes.component').then(m => m.ClassesComponent) },
      { path: 'subjects', loadComponent: () => import('./features/subjects/subjects.component').then(m => m.SubjectsComponent) },
      { path: 'lessons', loadComponent: () => import('./features/lessons/lessons.component').then(m => m.LessonsComponent) },
      { path: 'assignments', loadComponent: () => import('./features/assignments/assignments.component').then(m => m.AssignmentsComponent) },
      { path: 'exams', loadComponent: () => import('./features/exams/exams.component').then(m => m.ExamsComponent) },
      { path: 'attendance', loadComponent: () => import('./features/attendance/attendance.component').then(m => m.AttendanceComponent) },
      { path: 'grades', loadComponent: () => import('./features/grades/grades.component').then(m => m.GradesComponent) },
      { path: 'announcements', loadComponent: () => import('./features/announcements/announcements.component').then(m => m.AnnouncementsComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // Students & Parents Layout & Routes
  {
    path: 'student',
    loadComponent: () => import('./layouts/student-layout/student-layout.component').then(m => m.StudentLayoutComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['STUDENT', 'PARENT'] },
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'lessons', loadComponent: () => import('./features/lessons/lessons.component').then(m => m.LessonsComponent) },
      { path: 'assignments', loadComponent: () => import('./features/assignments/assignments.component').then(m => m.AssignmentsComponent) },
      { path: 'exams', loadComponent: () => import('./features/exams/exams.component').then(m => m.ExamsComponent) },
      { path: 'attendance', loadComponent: () => import('./features/attendance/attendance.component').then(m => m.AttendanceComponent) },
      { path: 'grades', loadComponent: () => import('./features/grades/grades.component').then(m => m.GradesComponent) },
      { path: 'announcements', loadComponent: () => import('./features/announcements/announcements.component').then(m => m.AnnouncementsComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // Global top-level convenience shortcuts
  { path: 'dashboard', redirectTo: 'admin/dashboard', pathMatch: 'full' },
  { path: 'students', redirectTo: 'admin/students', pathMatch: 'full' },
  { path: 'teachers', redirectTo: 'admin/teachers', pathMatch: 'full' },
  { path: 'classes', redirectTo: 'admin/classes', pathMatch: 'full' },
  { path: 'subjects', redirectTo: 'admin/subjects', pathMatch: 'full' },
  { path: 'assignments', redirectTo: 'admin/assignments', pathMatch: 'full' },
  { path: 'exams', redirectTo: 'admin/exams', pathMatch: 'full' },
  { path: 'attendance-stats', redirectTo: 'admin/attendance-stats', pathMatch: 'full' },
  { path: 'grades', redirectTo: 'admin/grades', pathMatch: 'full' },
  { path: 'announcements', redirectTo: 'admin/announcements', pathMatch: 'full' },

  // Wildcard fallback
  { path: '**', redirectTo: '' }
];
