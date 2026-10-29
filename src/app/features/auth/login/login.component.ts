import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { UserRole } from '../../../core/models/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="bg-white/95 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl space-y-6 text-slate-800">
      <!-- Title & Header -->
      <div class="text-center space-y-1.5">
        <div class="w-16 h-16 mx-auto mb-2 rounded-2xl bg-gradient-to-tr from-primary-800 to-primary-600 text-white flex items-center justify-center shadow-lg shadow-primary-900/30">
          <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 class="text-2xl font-black text-slate-900">تسجيل الدخول للنظام</h2>
        <p class="text-xs text-slate-500">أدخل الرقم القومي أو البريد الإلكتروني وكلمة المرور للمتابعة</p>
      </div>

      <!-- Session Expired Alert -->
      @if (sessionExpired()) {
        <div class="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <svg class="w-5 h-5 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>انتهت صلاحية الجلسة، يُرجى إعادة تسجيل الدخول مرة أخرى.</span>
        </div>
      }

      <!-- Error Message Alert -->
      @if (errorMessage()) {
        <div class="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <svg class="w-5 h-5 shrink-0 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ errorMessage() }}</span>
        </div>
      }

      <!-- Login Form -->
      <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-4">
        <!-- National ID / Email -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-700">
            الرقم القومي / البريد الإلكتروني
          </label>
          <div class="relative">
            <input 
              type="text" 
              formControlName="identifier"
              placeholder="مثال: 30101011234567 أو user@school.edu.eg"
              class="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 transition-all"
              [class.border-rose-400]="identifierInvalid()"
            />
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </span>
          </div>
          @if (identifierInvalid()) {
            <p class="text-[11px] text-rose-600 font-medium">الرقم القومي أو البريد الإلكتروني مطلوب</p>
          }
        </div>

        <!-- Password -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label class="block text-xs font-bold text-slate-700">كلمة المرور</label>
            <a href="javascript:void(0)" class="text-xs text-primary-600 hover:text-primary-800 font-semibold">نسيت كلمة المرور؟</a>
          </div>
          <div class="relative">
            <input 
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="password"
              placeholder="••••••••"
              class="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 transition-all"
              [class.border-rose-400]="passwordInvalid()"
            />
            <button 
              type="button" 
              (click)="toggleShowPassword()" 
              class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 hover:text-slate-600">
              @if (showPassword()) {
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              } @else {
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              }
            </button>
          </div>
          @if (passwordInvalid()) {
            <p class="text-[11px] text-rose-600 font-medium">كلمة المرور مطلوبة (6 أحرف على الأقل)</p>
          }
        </div>

        <!-- Remember Me Checkbox -->
        <div class="flex items-center gap-2 pt-1">
          <input 
            type="checkbox" 
            id="rememberMe" 
            formControlName="rememberMe"
            class="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500 cursor-pointer"
          />
          <label for="rememberMe" class="text-xs text-slate-600 cursor-pointer select-none">
            تذكر بيانات الدخول على هذا الجهاز
          </label>
        </div>

        <!-- Submit Button -->
        <button 
          type="submit" 
          [disabled]="isLoading()"
          class="w-full py-3.5 px-4 bg-primary-800 hover:bg-primary-900 active:bg-primary-950 text-white font-bold rounded-xl shadow-lg shadow-primary-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          @if (isLoading()) {
            <span class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            <span>جاري التحقق والدخول...</span>
          } @else {
            <span>تسجيل الدخول</span>
            <svg class="w-4 h-4 transform rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          }
        </button>
      </form>

      <!-- Quick Mock Persona Switcher (For testing roles and guards directly) -->
      <div class="pt-4 border-t border-slate-100">
        <p class="text-[11px] font-bold text-slate-400 text-center uppercase tracking-wider mb-2">الدخول التجريبي الفوري للمنظومة</p>
        <div class="grid grid-cols-3 gap-2">
          <button 
            type="button"
            (click)="quickDemoLogin('ADMIN')"
            class="p-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-primary-50 hover:text-primary-800 text-slate-700 transition-colors border border-slate-200/60">
            الإدارة
          </button>
          <button 
            type="button"
            (click)="quickDemoLogin('TEACHER')"
            class="p-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-primary-50 hover:text-primary-800 text-slate-700 transition-colors border border-slate-200/60">
            المعلم
          </button>
          <button 
            type="button"
            (click)="quickDemoLogin('STUDENT')"
            class="p-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-primary-50 hover:text-primary-800 text-slate-700 transition-colors border border-slate-200/60">
            الطالب
          </button>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

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
    this.route.queryParams.subscribe(params => {
      if (params['sessionExpired']) {
        this.sessionExpired.set(true);
      }
    });
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
          fullName: 'أ. د. محمود عبد العزيز الشناوي',
          email: 'admin@school.edu.eg',
          role: 'ADMIN',
          mustChangePassword: false,
          status: 'ACTIVE',
          schoolName: 'مدرسة الشهيد أحمد إبراهيم الرسمية المتميزة لغات',
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
          schoolName: 'مدرسة الشهيد أحمد إبراهيم الرسمية المتميزة لغات',
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
          schoolName: 'مدرسة الشهيد أحمد إبراهيم الرسمية المتميزة لغات',
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
          gradeLevel: 'الصف الأول الثانوي (لغات)',
          className: '1/3 متفوقين',
          schoolName: 'مدرسة الشهيد أحمد إبراهيم الرسمية المتميزة لغات',
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
          schoolName: 'مدرسة الشهيد أحمد إبراهيم الرسمية المتميزة لغات',
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

