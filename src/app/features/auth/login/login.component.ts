import { ChangeDetectionStrategy, Component, inject, isDevMode, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { UserRole } from '../../../core/models/user.model';
import { SCHOOL_INFO } from '../../../core/constants/school.constants';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly school = SCHOOL_INFO;
  readonly showDemoLogin = isDevMode();

  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showPassword = signal<boolean>(false);
  readonly sessionExpired = signal<boolean>(false);

  readonly loginForm: FormGroup = this.fb.group({
    identifier: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [false]
  });

  constructor() {
    // Read once from the snapshot: no long-lived subscription to clean up
    this.sessionExpired.set(this.route.snapshot.queryParamMap.has('sessionExpired'));
  }

  identifierInvalid(): boolean {
    const ctrl = this.loginForm.get('identifier');
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  passwordInvalid(): boolean {
    const ctrl = this.loginForm.get('password');
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  toggleShowPassword(): void {
    this.showPassword.update(v => !v);
  }

  fillAccount(identifier: string, pass: string): void {
    this.loginForm.patchValue({
      identifier,
      password: pass
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { identifier, password, rememberMe } = this.loginForm.value;

    this.authService.login({ identifier, password, rememberMe }).subscribe({
      next: () => {
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'تعذر التحقق من البيانات. برجاء التأكد من اسم المستخدم وكلمة المرور.');
      }
    });
  }

  quickDemoLogin(role: UserRole): void {
    this.isLoading.set(true);
    
    // Simulate instant authenticated session for development & evaluation
    setTimeout(() => {
      const demoUsers: Record<UserRole, any> = {
        ADMIN: {
          id: 'adm-001',
          nationalId: '28001011234567',
          fullName: SCHOOL_INFO.principal,
          email: 'admin@school.edu.eg',
          role: 'ADMIN',
          mustChangePassword: false,
          status: 'ACTIVE',
          schoolName: SCHOOL_INFO.fullName,
          createdAt: new Date().toISOString()
        },
        SUPER_ADMIN: {
          id: 'sup-001',
          nationalId: '27501011234567',
          fullName: 'إدارة تكنولوجيا التعليم المركزية',
          email: 'superadmin@school.edu.eg',
          role: 'SUPER_ADMIN',
          mustChangePassword: false,
          status: 'ACTIVE',
          schoolName: SCHOOL_INFO.fullName,
          createdAt: new Date().toISOString()
        },
        TEACHER: {
          id: 'tch-001',
          nationalId: '28905051234567',
          fullName: 'الأستاذة / نادية كمال الشربيني',
          email: 'nadia.teacher@school.edu.eg',
          role: 'TEACHER',
          mustChangePassword: false,
          status: 'ACTIVE',
          schoolName: SCHOOL_INFO.fullName,
          subjects: ['اللغة الإنجليزية', 'العلوم'],
          createdAt: new Date().toISOString()
        },
        STUDENT: {
          id: 'std-001',
          nationalId: '31001011234567',
          fullName: 'أحمد ياسين محمد إبراهيم',
          email: 'ahmed.student@school.edu.eg',
          role: 'STUDENT',
          mustChangePassword: false,
          status: 'ACTIVE',
          gradeLevel: 'الصف الأول الإعدادي',
          className: '1/3',
          schoolName: SCHOOL_INFO.fullName,
          createdAt: new Date().toISOString()
        },
        PARENT: {
          id: 'prn-001',
          nationalId: '27001011234567',
          fullName: 'المهندس / ياسين محمد إبراهيم',
          email: 'yassin.parent@school.edu.eg',
          role: 'PARENT',
          mustChangePassword: false,
          status: 'ACTIVE',
          schoolName: SCHOOL_INFO.fullName,
          createdAt: new Date().toISOString()
        }
      };

      const user = demoUsers[role];
      const mockToken = `header.${btoa(JSON.stringify({ sub: user.id, role: user.role, exp: Math.floor(Date.now() / 1000) + 86400 }))}.signature`;
      
      localStorage.setItem('sch_access_token', mockToken);
      localStorage.setItem('sch_user_profile', JSON.stringify(user));
      this.authService.currentUser.set(user);
      
      this.isLoading.set(false);
      this.authService.navigateToRoleDashboard(role);
    }, 400);
  }
}

