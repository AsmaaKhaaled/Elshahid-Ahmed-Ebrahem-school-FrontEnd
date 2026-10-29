import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 text-slate-100 flex flex-col justify-between relative overflow-hidden font-cairo">
      <!-- Background Ambient Glow & Patterns -->
      <div class="absolute -top-40 -right-40 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Header with School Identity -->
      <header class="p-6 md:p-8 flex items-center justify-between relative z-10">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-500 to-sky-400 p-0.5 flex items-center justify-center shadow-lg shadow-primary-900/50">
            <div class="w-full h-full bg-slate-950/40 rounded-[14px] flex items-center justify-center">
              <svg class="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
          </div>
          <div>
            <h1 class="text-lg md:text-xl font-black text-white tracking-tight">مدرسة الشهيد أحمد إبراهيم</h1>
            <p class="text-xs text-primary-300 font-medium">الرسمية المتميزة لغات - نظام الإدارة المدرسية الموحد</p>
          </div>
        </div>

        <div class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>العام الدراسي 2026 / 2027</span>
        </div>
      </header>

      <!-- Main Form Container -->
      <main class="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10 my-4">
        <div class="w-full max-w-md">
          <router-outlet></router-outlet>
        </div>
      </main>

      <!-- Footer -->
      <footer class="p-6 text-center text-xs text-slate-400 relative z-10 border-t border-white/5">
        <p>جميع الحقوق محفوظة © {{ currentYear }} لمدرسة الشهيد أحمد إبراهيم الرسمية المتميزة لغات - وزارة التربية والتعليم</p>
      </footer>
    </div>
  `
})
export class AuthLayoutComponent {
  readonly currentYear = new Date().getFullYear();
}

