import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { passwordChangeGuard } from './core/guards/password-change.guard';
import { adminSectionGuard } from './core/guards/admin-section.guard';
import { featureRedirectGuard } from './core/guards/feature-redirect.guard';
import { guestGuard } from './core/guards/guest.guard';
import { SUPER_ADMIN_ONLY } from './core/admin/admin-permissions';

export const routes: Routes = [
  // Landing page: student & teacher login (signed-in users go to their dashboard)
  {
    path: '',
    loadComponent: () => import('./features/auth/portal-login/portal-login.component').then(m => m.PortalLoginComponent),
    canActivate: [guestGuard],
    pathMatch: 'full'
  },
  // Public school home page
  {
    path: 'home',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent)
  },

  // Authentication Routes
  {
    path: 'auth',
    loadComponent: () => import('./layouts/auth-layout/auth-layout.component').then(m => m.AuthLayoutComponent),
    children: [
      { path: 'login', redirectTo: '/', pathMatch: 'full' },
      // Old address of the administration login
      { path: 'admin', redirectTo: '/admin/login', pathMatch: 'full' },
      {
        path: 'set-initial-password', 
        loadComponent: () => import('./features/auth/set-initial-password/set-initial-password.component').then(m => m.SetInitialPasswordComponent),
        canActivate: [passwordChangeGuard]
      },
      { path: '', redirectTo: '/', pathMatch: 'full' }
    ]
  },

  // School administration login - reached from the small "دخول الإدارة" link on the login page.
  // Declared before the protected /admin block so its guards don't apply here.
  {
    path: 'admin/login',
    loadComponent: () => import('./features/auth/admin-login/admin-login.component').then(m => m.AdminLoginComponent)
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
      { path: 'classes', data: { access: 'classes' }, 
      loadComponent: () => import('./features/classes/classes.component').then(m => m.ClassesComponent) },
      // Built from the teachers' schedules, so it shares their permission
      { path: 'school-timetable', data: { access: 'teachers' }, loadComponent: () => import('./features/school-timetable/school-timetable.component').then(m => m.SchoolTimetableComponent) },
      // View only: every teacher's curriculum files and their plan & objectives
      { path: 'subjects', loadComponent: () => import('./features/subjects/curriculum.component').then(m => m.CurriculumComponent) },
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
      // Only the classes the admin assigned to this teacher, with their students
      { path: 'classes', loadComponent: () => import('./features/classes/my-classes.component').then(m => m.MyClassesComponent) },
      { path: 'subjects', loadComponent: () => import('./features/subjects/curriculum.component').then(m => m.CurriculumComponent) },
      { path: 'lessons', loadComponent: () => import('./features/lessons/lessons.component').then(m => m.LessonsComponent) },
      { path: 'materials', loadComponent: () => import('./features/materials/materials.component').then(m => m.MaterialsComponent) },
      { path: 'assignments', loadComponent: () => import('./features/assignments/assignments.component').then(m => m.AssignmentsComponent) },
      { path: 'quizzes', loadComponent: () => import('./features/quizzes/quizzes.component').then(m => m.QuizzesComponent) },
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
      { path: 'subjects', loadComponent: () => import('./features/subjects/curriculum.component').then(m => m.CurriculumComponent) },
      { path: 'lessons', loadComponent: () => import('./features/lessons/lessons.component').then(m => m.LessonsComponent) },
      { path: 'materials', loadComponent: () => import('./features/materials/materials.component').then(m => m.MaterialsComponent) },
      { path: 'assignments', loadComponent: () => import('./features/assignments/assignments.component').then(m => m.AssignmentsComponent) },
      { path: 'quizzes', loadComponent: () => import('./features/quizzes/quizzes.component').then(m => m.QuizzesComponent) },
      { path: 'exams', loadComponent: () => import('./features/exams/exams.component').then(m => m.ExamsComponent) },
      { path: 'attendance', loadComponent: () => import('./features/attendance/attendance.component').then(m => m.AttendanceComponent) },
      { path: 'grades', loadComponent: () => import('./features/grades/grades.component').then(m => m.GradesComponent) },
      { path: 'announcements', loadComponent: () => import('./features/announcements/announcements.component').then(m => m.AnnouncementsComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // Global top-level convenience shortcuts with smart role-based routing
  { path: 'dashboard', canActivate: [featureRedirectGuard('dashboard')], children: [] },
  { path: 'students', canActivate: [featureRedirectGuard('students')], children: [] },
  { path: 'teachers', canActivate: [featureRedirectGuard('teachers')], children: [] },
  { path: 'classes', canActivate: [featureRedirectGuard('classes')], children: [] },
  { path: 'lessons', canActivate: [featureRedirectGuard('lessons')], children: [] },
  { path: 'subjects', loadComponent: () => import('./features/subjects/subjects.component').then(m => m.SubjectsComponent) },
  { path: 'assignments', canActivate: [featureRedirectGuard('assignments')], children: [] },
  { path: 'materials', canActivate: [featureRedirectGuard('materials')], children: [] },
  { path: 'quizzes', canActivate: [featureRedirectGuard('quizzes')], children: [] },
  { path: 'exams', canActivate: [featureRedirectGuard('exams')], children: [] },
  { path: 'attendance-stats', canActivate: [featureRedirectGuard('attendance-stats')], children: [] },
  { path: 'grades', canActivate: [featureRedirectGuard('grades')], children: [] },
  { path: 'announcements', loadComponent: () => import('./features/announcements/announcements.component').then(m => m.AnnouncementsComponent) },

  // Wildcard fallback
  { path: '**', redirectTo: '' }
];
