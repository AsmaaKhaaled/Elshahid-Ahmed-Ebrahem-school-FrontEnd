import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';

interface TeacherShowcase {
  id: string;
  name: string;
  category: string;
  role: string;
  quota: string;
  rating: string;
  avatar: string;
}

interface SchoolNotice {
  day: string;
  month: string;
  tag: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="min-h-screen bg-[#f8fafc] text-slate-800 font-cairo selection:bg-portal-teal/20 selection:text-portal-teal">
      
      <!-- ================= 1. Top Notice & Academic Session Ticker ================= -->
      <div class="bg-gradient-to-r from-portal-navyDark via-portal-navy to-portal-navy text-white text-xs py-2 px-4 md:px-8 border-b border-white/10">
        <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <!-- Right Announcement -->
          <div class="flex items-center gap-2 text-[11px] sm:text-xs">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            <span class="text-slate-200">
              <strong class="text-white font-bold">تنويه أكاديمي:</strong> 
              بدء تفعيل نظام رصد درجات أعمال السنة والاختبار الشهري عبر بوابة المعلمين الإلكترونية لكافة المواد (الفصل الدراسي الثاني 2024/2025).
            </span>
          </div>

          <!-- Left Pill Badges -->
          <div class="flex items-center gap-3 shrink-0 text-[11px]">
            <span class="bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15 text-slate-200">
              العام الدراسي: 2024 - 2025
            </span>
            <span class="hidden md:inline-flex items-center gap-1.5 text-primary-200 bg-portal-navyDark/60 px-2.5 py-0.5 rounded-full border border-primary-400/20">
              <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>نظام التعليم المصري المعتمد</span>
            </span>
          </div>
        </div>
      </div>

      <!-- ================= 2. Main Navigation Bar ================= -->
      <header class="bg-white sticky top-0 z-40 border-b border-slate-200 shadow-sm">
        <div class="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          
          <!-- School Identity & Crest -->
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-portal-navy text-white flex items-center justify-center p-2 shadow-md shadow-portal-navy/20 border border-portal-navyLight">
              <svg class="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 14l9-5-9-5-9 5 9 5z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <div>
              <h1 class="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                مدرسة الشهيد أحمد إبراهيم حسب الله الإعدادية بنين
              </h1>
              <p class="text-[11px] text-slate-500 font-semibold">
                بوابة التعلم والخدمات الأكاديمية الإلكترونية
              </p>
            </div>
          </div>

          <!-- Middle Navigation Links -->
          <nav class="hidden lg:flex items-center gap-1 text-xs font-bold text-slate-600">
            <a routerLink="/" class="px-4 py-2 rounded-xl bg-portal-navy text-white shadow-sm transition-all">
              الرئيسية
            </a>
            <button (click)="openStudentModal()" class="px-3.5 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors">
              لوحة الطالب
            </button>
            <a routerLink="/subjects" class="px-3.5 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors">
              المواد الدراسية
            </a>
            <a routerLink="/exams" class="px-3.5 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors">
              الاختبارات
            </a>
            <a routerLink="/grades" class="px-3.5 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors">
              النتائج
            </a>
            <a routerLink="/announcements" class="px-3.5 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors">
              الإعلانات والتنبيهات
            </a>
          </nav>

          <!-- Left User Status Widget -->
          <div class="flex items-center gap-3">
            <div class="hidden sm:flex items-center gap-3 p-1.5 pr-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div class="text-right">
                <span class="block text-xs font-bold text-slate-800 leading-tight">عمر أحمد محمود</span>
                <span class="block text-[10px] text-slate-500 font-medium">الصف الثاني الإعدادي • فصل 2/3</span>
              </div>
              <div class="w-9 h-9 rounded-xl bg-portal-teal text-white flex items-center justify-center font-bold text-xs shadow-sm">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>

            <!-- Notifications Bell -->
            <button 
              type="button" 
              class="relative p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              title="الإشعارات المدرسية">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span class="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full"></span>
            </button>
          </div>
        </div>
      </header>

      <!-- ================= 3. Hero Section ================= -->
      <section class="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          <!-- Hero Text (Right Column in RTL) -->
          <div class="lg:col-span-7 space-y-6">
            
            <!-- Category Badge -->
            <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold shadow-xs">
              <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>المنظومة الرقمية الموحدة للمعلم والطالب</span>
            </div>

            <!-- Main Headline -->
            <h2 class="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.25]">
              منصة التعلم الذكية والبيئة الأكاديمية المتكاملة
            </h2>

            <!-- Paragraph -->
            <p class="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
              فضاء رقمي تربوي رصين يُمكّن أبناءنا الطلاب من استيعاب المناهج وحل الاختبارات التفاعلية، ويوفر للسادة المعلمين بيئة احترافية لإدارة التحضير، بنوك الأسئلة، والرصد الفوري للدرجات بكل دقة واعتمادية.
            </p>

            <!-- Hero Action Buttons -->
            <div class="flex flex-wrap items-center gap-3 pt-2">
              
              <!-- Teacher Portal Button -->
              <button 
                (click)="openTeacherModal()"
                type="button"
                class="px-5 py-3.5 rounded-2xl bg-portal-navy hover:bg-portal-navyDark text-white font-bold text-xs sm:text-sm shadow-md shadow-portal-navy/20 flex items-center gap-3 transition-all transform hover:-translate-y-0.5">
                <div class="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                </div>
                <div class="text-right">
                  <span class="block">دخول بوابة المعلم الأكاديمية</span>
                  <span class="block text-[10px] text-primary-200 font-normal">كود الفحص السريع: 2001-TCH</span>
                </div>
                <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <!-- Student Portal Button -->
              <button 
                (click)="openStudentModal()"
                type="button"
                class="px-5 py-3.5 rounded-2xl bg-portal-teal hover:bg-portal-tealDark text-white font-bold text-xs sm:text-sm shadow-md shadow-portal-teal/20 flex items-center gap-3 transition-all transform hover:-translate-y-0.5">
                <div class="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                </div>
                <div class="text-right">
                  <span class="block">دخول بوابة الطالب</span>
                  <span class="block text-[10px] text-emerald-200 font-normal">كود التجربة: 1001-STU</span>
                </div>
                <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <!-- Admin Control Button -->
              <a 
                routerLink="/admin/dashboard"
                class="px-4 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 shadow-sm flex items-center gap-2 transition-colors">
                <svg class="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>بوابة الإدارة والكنترول</span>
              </a>

            </div>

            <!-- KPI Counters Bar -->
            <div class="pt-6 border-t border-slate-200/80 grid grid-cols-4 gap-2 sm:gap-4 max-w-xl">
              <div class="text-center sm:text-right">
                <span class="block text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">+840</span>
                <span class="block text-[11px] font-semibold text-slate-500 mt-0.5">طالباً منتظماً</span>
              </div>
              <div class="text-center sm:text-right border-r border-slate-200 pr-2 sm:pr-4">
                <span class="block text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">+54</span>
                <span class="block text-[11px] font-semibold text-slate-500 mt-0.5">معلماً وخبيراً تربوياً</span>
              </div>
              <div class="text-center sm:text-right border-r border-slate-200 pr-2 sm:pr-4">
                <span class="block text-xl sm:text-2xl font-black text-emerald-600 tracking-tight font-mono">98%</span>
                <span class="block text-[11px] font-semibold text-slate-500 mt-0.5">نسبة التفوق والنجاح</span>
              </div>
              <div class="text-center sm:text-right border-r border-slate-200 pr-2 sm:pr-4">
                <span class="block text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">12</span>
                <span class="block text-[11px] font-semibold text-slate-500 mt-0.5">معمل تكنولوجيا وبحثاً</span>
              </div>
            </div>

          </div>

          <!-- Hero Image & Live Badge (Left Column in RTL) -->
          <div class="lg:col-span-5 relative">
            <div class="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-slate-800 aspect-[4/3] group">
              <!-- Illustrated Classroom Photo Background -->
              <img 
                src="https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=1000&auto=format&fit=crop" 
                alt="معمل الحاسب الآلي والعلوم - مدرسة الشهيد أحمد إبراهيم"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 brightness-95"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent"></div>

              <!-- Floating Live Activity Badge on Image -->
              <div class="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-white/40 shadow-lg flex items-center justify-between gap-3">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p class="text-xs font-bold text-slate-900 leading-tight">
                      تم اكتمال تصحيح اختبار العلوم
                    </p>
                    <p class="text-[10px] text-slate-500 mt-0.5">
                      الصف الثاني الإعدادي • فصل 2/3 (32 ورقة)
                    </p>
                  </div>
                </div>

                <span class="text-[11px] font-black text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg shrink-0">
                  100% رصد
                </span>
              </div>
            </div>
          </div>

        </div>
      </section>

      <!-- ================= 4. Dedicated Portal Login Section (The Two Big Buttons) ================= -->
      <section class="max-w-7xl mx-auto px-4 md:px-8 py-6">
        <div class="bg-white rounded-3xl p-6 sm:p-8 shadow-card border border-slate-200/80">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            <!-- Information Text (Right in RTL) -->
            <div class="space-y-1.5 max-w-xl">
              <span class="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full inline-block border border-emerald-200">
                منظومة الدخول الإلكترونية الموحدة
              </span>
              <h3 class="text-2xl font-black text-slate-900 tracking-tight">
                تسجيل الدخول إلى البوابات التعليمية
              </h3>
              <p class="text-xs sm:text-sm text-slate-500 leading-relaxed">
                اختر بوابتك المخصصة لتسجيل الدخول السريع عبر النوافذ الآمنة المعتمدة للطلاب والسادة أعضاء هيئة التدريس.
              </p>
            </div>

            <!-- Two Distinctive Portal Action Buttons (Left in RTL) -->
            <div class="flex flex-col sm:flex-row items-center gap-4 shrink-0">
              
              <!-- 1. Student Login Button (Opens Modal) -->
              <button 
                (click)="openStudentModal()"
                type="button" 
                class="w-full sm:w-auto min-w-[240px] px-6 py-4 rounded-2xl bg-portal-teal hover:bg-portal-tealDark text-white font-bold shadow-lg shadow-portal-teal/20 transition-all flex items-center justify-between gap-4 group">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    </svg>
                  </div>
                  <div class="text-right">
                    <span class="block text-sm font-black">تسجيل دخول الطالب</span>
                    <span class="block text-[11px] text-emerald-100 font-normal mt-0.5">بالبريد الإلكتروني وكود الطالب</span>
                  </div>
                </div>
                <svg class="w-5 h-5 text-white transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>

              <!-- 2. Teacher Login Button (Opens Modal) -->
              <button 
                (click)="openTeacherModal()"
                type="button" 
                class="w-full sm:w-auto min-w-[240px] px-6 py-4 rounded-2xl bg-portal-navy hover:bg-portal-navyDark text-white font-bold shadow-lg shadow-portal-navy/20 transition-all flex items-center justify-between gap-4 group">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                  </div>
                  <div class="text-right">
                    <span class="block text-sm font-black">تسجيل دخول المعلم</span>
                    <span class="block text-[11px] text-primary-200 font-normal mt-0.5">بالرقم القومي وكلمة المرور</span>
                  </div>
                </div>
                <svg class="w-5 h-5 text-white transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>

            </div>

          </div>
        </div>
      </section>

      <!-- ================= 5. Elite Faculty Showcase ("نخبة المعلمين والموجهين الأوائل") ================= -->
      <section class="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 space-y-6">
        
        <!-- Section Title -->
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <div class="flex items-center gap-2 text-xs text-slate-500 font-semibold mb-1">
              <span>هيئة التدريس ونادي المعلم المبتكر</span>
              <span>•</span>
              <span class="text-amber-600 font-bold">التقييم التربوي المعتمد: تميز تكنولوجي 2024</span>
            </div>
            <h3 class="text-2xl font-black text-slate-900 tracking-tight">نخبة المعلمين والموجهين الأوائل</h3>
          </div>
        </div>

        <!-- Teachers Grid (6 Cards Matching Design) -->
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          @for (teacher of teachers; track teacher.id) {
            <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/90 hover:border-portal-navy/40 transition-all flex flex-col items-center text-center justify-between group">
              
              <!-- Avatar -->
              <div class="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-100 shadow-sm mb-3">
                <img [src]="teacher.avatar" [alt]="teacher.name" class="w-full h-full object-cover" />
              </div>

              <!-- Subject Category Badge -->
              <span class="text-[10px] font-bold text-primary-800 bg-primary-50 px-2.5 py-0.5 rounded-full mb-1">
                {{ teacher.category }}
              </span>

              <!-- Name & Role -->
              <div class="space-y-0.5 my-1">
                <h4 class="text-xs font-black text-slate-900">{{ teacher.name }}</h4>
                <p class="text-[10px] text-slate-500 leading-tight line-clamp-2">{{ teacher.role }}</p>
              </div>

              <!-- Quota & Star Rating -->
              <div class="w-full pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                <span>{{ teacher.quota }}</span>
                <span class="font-bold text-amber-500 font-mono">{{ teacher.rating }} ★</span>
              </div>
            </div>
          }
        </div>

        <!-- Honor Banner Below Teachers -->
        <div class="bg-gradient-to-r from-portal-navyDark via-portal-navy to-portal-navy text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
          <div class="flex items-center gap-3.5 text-right">
            <div class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-amber-400">
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div>
              <h5 class="text-xs sm:text-sm font-bold text-white">لوحة شرف المعلم المثالي وإنجازات التوجيه الفني</h5>
              <p class="text-[11px] text-slate-300 mt-0.5">
                حصلت المدرسة على المركز الأول في تفعيل المنصات الذكية وتصميم الاختبارات الإلكترونية التفاعلية على مستوى الإدارة التعليمية لعام 2024.
              </p>
            </div>
          </div>

          <button 
            type="button" 
            class="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 shrink-0 transition-colors">
            تسجيل إنجاز تربوي جديد
          </button>
        </div>

      </section>

      <!-- ================= 6. Bottom Split: Announcements & Academic KPI Monitors ================= -->
      <section class="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <!-- Right: Announcements & School Notices (7 cols) -->
          <div class="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 shadow-card border border-slate-200/80 space-y-5">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <svg class="w-5 h-5 text-portal-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <h3 class="text-base font-black text-slate-900">آخر الإعلانات والتنبيهات المدرسية</h3>
              </div>
            </div>

            <!-- Announcements List -->
            <div class="space-y-4">
              @for (item of notices; track item.title) {
                <div class="flex items-start gap-4 p-3.5 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
                  <!-- Date Badge -->
                  <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 flex flex-col items-center justify-center shrink-0 border border-slate-200">
                    <span class="text-sm font-black leading-none font-mono">{{ item.day }}</span>
                    <span class="text-[9px] font-bold text-slate-500 mt-0.5">{{ item.month }}</span>
                  </div>

                  <!-- Details -->
                  <div class="flex-1 space-y-1">
                    <div class="flex items-center gap-2">
                      <span class="text-[10px] font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-md">
                        {{ item.tag }}
                      </span>
                    </div>
                    <h4 class="text-xs sm:text-sm font-bold text-slate-900">{{ item.title }}</h4>
                    <p class="text-xs text-slate-500 leading-relaxed">{{ item.description }}</p>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Left: Academic Engagement Metrics (5 cols) -->
          <div class="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 shadow-card border border-slate-200/80 space-y-5">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <svg class="w-5 h-5 text-portal-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 class="text-base font-black text-slate-900">مؤشرات التفاعل الأكاديمي المباشر</h3>
              </div>
              <a routerLink="/announcements" class="text-xs font-bold text-portal-teal hover:underline">
                عرض أرشيف الإعلانات
              </a>
            </div>

            <p class="text-[11px] text-slate-500 font-semibold">إحصائيات المنصة هذا الأسبوع • تحديث حي مباشر</p>

            <!-- Progress Bars -->
            <div class="space-y-4">
              <!-- Item 1 -->
              <div class="space-y-1.5">
                <div class="flex justify-between text-xs font-bold">
                  <span class="text-slate-700">مادة العلوم (حل الاختبارات وحضور المعمل)</span>
                  <span class="text-portal-teal font-mono">96%</span>
                </div>
                <div class="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div class="h-full bg-portal-teal rounded-full" style="width: 96%"></div>
                </div>
              </div>

              <!-- Item 2 -->
              <div class="space-y-1.5">
                <div class="flex justify-between text-xs font-bold">
                  <span class="text-slate-700">مادة الرياضيات (واجبات الجبر والهندسة)</span>
                  <span class="text-portal-navy font-mono">88%</span>
                </div>
                <div class="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div class="h-full bg-portal-navy rounded-full" style="width: 88%"></div>
                </div>
              </div>

              <!-- Item 3 -->
              <div class="space-y-1.5">
                <div class="flex justify-between text-xs font-bold">
                  <span class="text-slate-700">اللغة العربية (التعبير والنصوص والقواعد)</span>
                  <span class="text-emerald-600 font-mono">92%</span>
                </div>
                <div class="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div class="h-full bg-emerald-600 rounded-full" style="width: 92%"></div>
                </div>
              </div>

              <!-- Item 4 -->
              <div class="space-y-1.5">
                <div class="flex justify-between text-xs font-bold">
                  <span class="text-slate-700">الدراسات واللغة الإنجليزية</span>
                  <span class="text-primary-700 font-mono">84%</span>
                </div>
                <div class="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div class="h-full bg-primary-600 rounded-full" style="width: 84%"></div>
                </div>
              </div>
            </div>

            <!-- Inquiry Box -->
            <div class="pt-2">
              <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-xl bg-primary-100 text-primary-800 flex items-center justify-center font-bold text-xs shrink-0">
                    ؟
                  </div>
                  <div>
                    <h5 class="text-xs font-bold text-slate-900">غرفة الاستفسارات والتوجيه</h5>
                    <p class="text-[10px] text-slate-500">مفتوحة للرد على أسئلة الطلاب</p>
                  </div>
                </div>

                <button type="button" class="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 shadow-xs">
                  طرح سؤال
                </button>
              </div>
            </div>

          </div>

        </div>
      </section>

      <!-- ================= 7. Footer ================= -->
      <footer class="bg-white border-t border-slate-200 mt-12 py-8 text-xs text-slate-500">
        <div class="max-w-7xl mx-auto px-4 md:px-8 space-y-6">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h4 class="text-sm font-black text-slate-900">مدرسة الشهيد أحمد إبراهيم حسب الله الإعدادية بنين</h4>
              <p class="text-xs text-slate-500 mt-1 italic font-medium">« بالعلم نبني الأوطان.. وبالخلق نسمو بالإنسان »</p>
            </div>

            <div class="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
              <a href="javascript:void(0)" class="hover:text-portal-navy">لائحة الانضباط المدرسي</a>
              <span>•</span>
              <a href="javascript:void(0)" class="hover:text-portal-navy">الدعم الفني والإرشاد</a>
              <span>•</span>
              <a href="javascript:void(0)" class="hover:text-portal-navy">بوابة ولي الأمر</a>
              <span>•</span>
              <a href="javascript:void(0)" class="hover:text-portal-navy">إشراف إدارة المدرسة والتعليم الإعدادي</a>
            </div>
          </div>

          <div class="pt-4 border-t border-slate-100 text-center text-[11px] text-slate-400">
            جميع الحقوق محفوظة © وزارة التربية والتعليم والتعليم الفني - جمهورية مصر العربية
          </div>
        </div>
      </footer>

      <!-- ================= 8. STUDENT LOGIN MODAL (Matching Image 2) ================= -->
      @if (isStudentModalOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 relative animate-in zoom-in-95 duration-200">
            
            <!-- Modal Header -->
            <div class="p-6 pb-4 text-center relative border-b border-slate-100">
              <!-- Close Button -->
              <button 
                (click)="closeModals()"
                type="button" 
                class="absolute top-5 left-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <!-- Green Graduation Icon -->
              <div class="w-14 h-14 mx-auto rounded-2xl bg-portal-teal/10 text-portal-teal flex items-center justify-center mb-2.5 border border-portal-teal/20">
                <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
              </div>

              <h3 class="text-xl font-black text-slate-900 tracking-tight">تسجيل دخول الطالب</h3>
              <p class="text-xs text-slate-500 font-medium mt-0.5">مدرسة الشهيد أحمد إبراهيم حسب الله</p>
            </div>

            <!-- Student Info Strip -->
            <div class="bg-slate-50 px-6 py-2 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
              <span class="font-bold text-slate-700">حساب الطالب الموحد المعتمد</span>
              <span class="flex items-center gap-1 text-emerald-600 font-semibold">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>بيئة اختبارات آمنة</span>
              </span>
            </div>

            <!-- Student Form -->
            <div class="p-6 space-y-4">
              <!-- Email Input -->
              <div class="space-y-1.5">
                <label class="block text-xs font-bold text-slate-700">البريد الإلكتروني المدرسي للطالب</label>
                <div class="relative">
                  <input 
                    type="email" 
                    [(ngModel)]="studentEmail" 
                    placeholder="omar.ahmed@alshaheed.edu.eg"
                    class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-portal-teal/20 focus:border-portal-teal"
                  />
                  <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-mono text-xs">
                    &#64;
                  </span>
                </div>
              </div>

              <!-- Student Code Input -->
              <div class="space-y-1.5">
                <label class="block text-xs font-bold text-slate-700">كود الطالب المدرسي</label>
                <div class="relative">
                  <input 
                    type="text" 
                    [(ngModel)]="studentCode" 
                    placeholder="STU-1001"
                    class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-portal-teal/20 focus:border-portal-teal"
                  />
                  <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                  </span>
                </div>
              </div>

              <!-- Auxiliary Checkbox & Help -->
              <div class="flex items-center justify-between text-xs pt-1">
                <label class="flex items-center gap-2 cursor-pointer text-slate-600 select-none">
                  <input type="checkbox" [(ngModel)]="studentRememberMe" class="rounded text-portal-teal focus:ring-portal-teal" />
                  <span>تذكر بيانات الدخول</span>
                </label>
                <a href="javascript:void(0)" class="text-portal-teal hover:underline font-semibold text-[11px]">
                  استرجاع كود الطالب أو مساعدة الدخول
                </a>
              </div>

              <!-- Submit Button -->
              <button 
                (click)="submitStudentLogin()"
                type="button" 
                class="w-full py-3.5 px-4 rounded-xl bg-portal-teal hover:bg-portal-tealDark text-white font-bold text-sm shadow-md shadow-portal-teal/20 transition-all flex items-center justify-center gap-2 mt-2">
                <span>تسجيل الدخول إلى بوابة الطالب [→</span>
              </button>
            </div>

          </div>
        </div>
      }

      <!-- ================= 9. TEACHER LOGIN MODAL (Matching Image 1) ================= -->
      @if (isTeacherModalOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 relative animate-in zoom-in-95 duration-200">
            
            <!-- Dark Navy Header -->
            <div class="bg-portal-navy text-white p-6 pb-5 text-center relative">
              <!-- Close Button -->
              <button 
                (click)="closeModals()"
                type="button" 
                class="absolute top-5 left-5 text-slate-300 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <!-- Blue Teacher Card Icon -->
              <div class="w-14 h-14 mx-auto rounded-2xl bg-white/10 text-white flex items-center justify-center mb-2.5 border border-white/20">
                <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                </svg>
              </div>

              <h3 class="text-xl font-black text-white tracking-tight">تسجيل دخول المعلم</h3>
              <p class="text-xs text-primary-200 font-medium mt-0.5">مساحة السادة الأفاضل والكوادر التعليمية</p>
            </div>

            <!-- Teacher Info Strip -->
            <div class="bg-slate-50 px-6 py-2 border-b border-slate-200/80 flex items-center justify-between text-[11px] text-slate-600">
              <span class="font-bold text-slate-800">بوابة الخدمات والتحضير والرصد المعتمدة</span>
              <span class="font-mono text-primary-700 font-bold">كود المدرس الافتراضي: 2001-TCH</span>
            </div>

            <!-- Teacher Form -->
            <div class="p-6 space-y-4">
              <!-- National ID Input -->
              <div class="space-y-1.5">
                <label class="block text-xs font-bold text-slate-700">الرقم القومي للمعلم (14 رقماً)</label>
                <div class="relative">
                  <input 
                    type="text" 
                    [(ngModel)]="teacherNationalId" 
                    placeholder="28904151234567"
                    class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-portal-navy/20 focus:border-portal-navy"
                  />
                  <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                  </span>
                </div>
              </div>

              <!-- Password Input -->
              <div class="space-y-1.5">
                <label class="block text-xs font-bold text-slate-700">كلمة المرور الأكاديمية</label>
                <div class="relative">
                  <input 
                    [type]="teacherShowPassword() ? 'text' : 'password'" 
                    [(ngModel)]="teacherPassword" 
                    placeholder="••••••••••••"
                    class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-portal-navy/20 focus:border-portal-navy"
                  />
                  <button 
                    type="button" 
                    (click)="teacherShowPassword.set(!teacherShowPassword())"
                    class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600">
                    @if (teacherShowPassword()) {
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    } @else {
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    }
                  </button>
                </div>
              </div>

              <!-- Auxiliary Checkbox & Help -->
              <div class="flex items-center justify-between text-xs pt-1">
                <label class="flex items-center gap-2 cursor-pointer text-slate-600 select-none">
                  <input type="checkbox" [(ngModel)]="teacherRememberMe" class="rounded text-portal-navy focus:ring-portal-navy" />
                  <span>حفظ الجلسة الآمنة</span>
                </label>
                <a href="javascript:void(0)" class="text-primary-700 hover:underline font-semibold text-[11px]">
                  نسيت كلمة المرور؟ / الدعم الفني للمعلمين
                </a>
              </div>

              <!-- Submit Button -->
              <button 
                (click)="submitTeacherLogin()"
                type="button" 
                class="w-full py-3.5 px-4 rounded-xl bg-portal-navy hover:bg-portal-navyDark text-white font-bold text-sm shadow-md shadow-portal-navy/20 transition-all flex items-center justify-center gap-2 mt-2">
                <span>تسجيل الدخول إلى بوابة المعلم [→</span>
              </button>

              <!-- Footer Auxiliary for School Leadership -->
              <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <button 
                  type="button"
                  (click)="submitAdminLogin()"
                  class="font-bold text-primary-800 hover:underline flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>الدخول إلى إدارة المدرسة والكنترول</span>
                </button>
                <span>تحتاج لصلاحيات موسعة؟</span>
              </div>
            </div>

          </div>
        </div>
      }

    </div>
  `
})
export class HomeComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Modal Control Signals
  readonly isStudentModalOpen = signal<boolean>(false);
  readonly isTeacherModalOpen = signal<boolean>(false);

  // Student Form Model Signals
  readonly studentEmail = signal<string>('omar.ahmed@alshaheed.edu.eg');
  readonly studentCode = signal<string>('STU-1001');
  readonly studentRememberMe = signal<boolean>(true);

  // Teacher Form Model Signals
  readonly teacherNationalId = signal<string>('28904151234567');
  readonly teacherPassword = signal<string>('Academic#2026');
  readonly teacherShowPassword = signal<boolean>(false);
  readonly teacherRememberMe = signal<boolean>(true);

  // 6 Top Faculty Members matching the design
  readonly teachers: TeacherShowcase[] = [
    {
      id: '1',
      name: 'أ. طارق عبد الحميد',
      category: 'العلوم العامة',
      role: 'معلم خبير ومسؤول معمل العلوم',
      quota: 'الحصص: 18 / أسبوع',
      rating: '4.9',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop'
    },
    {
      id: '2',
      name: 'أ. محمود رضوان',
      category: 'الرياضيات والهندسة',
      role: 'رئيس قسم الرياضيات الإعدادية',
      quota: 'الحصص: 20 / أسبوع',
      rating: '5.0',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=250&auto=format&fit=crop'
    },
    {
      id: '3',
      name: 'أ. عبد الرحمن مصطفى',
      category: 'اللغة العربية',
      role: 'معلم أول لغة عربية وقرآن كريم',
      quota: 'الحصص: 22 / أسبوع',
      rating: '4.9',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=250&auto=format&fit=crop'
    },
    {
      id: '4',
      name: 'أ. هشام سلامة',
      category: 'الدراسات الاجتماعية',
      role: 'معلم تاريخ وجغرافيا مصر',
      quota: 'الحصص: 16 / أسبوع',
      rating: '4.8',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=250&auto=format&fit=crop'
    },
    {
      id: '5',
      name: 'أ. كريم فؤاد',
      category: 'اللغة الإنجليزية',
      role: 'منسق مناهج اللغة الإنجليزية المطورة',
      quota: 'الحصص: 18 / أسبوع',
      rating: '4.9',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=250&auto=format&fit=crop'
    },
    {
      id: '6',
      name: 'أ. إيهاب شاكر',
      category: 'الحاسب الآلي والذكاء',
      role: 'مسؤول التطوير التكنولوجي والبرمجة',
      quota: 'الحصص: 14 / أسبوع',
      rating: '5.0',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=250&auto=format&fit=crop'
    }
  ];

  // School Notices Matching Screenshot
  readonly notices: SchoolNotice[] = [
    {
      day: '12',
      month: 'مايو',
      tag: 'هام لجميع المعلمين • منذ يومين',
      title: 'فتح باب إدخال درجات التقويم الشامل والأنشطة الصفية',
      description: 'يُرجى من السادة معلمي المواد الأساسية الانتهاء من مراجعة بنوك الأسئلة ورصد درجات أعمال السنة عبر مساحة المعلم قبل نهاية الأسبوع الجاري.'
    },
    {
      day: '08',
      month: 'مايو',
      tag: 'للطلاب وأولياء الأمور • منذ 5 أيام',
      title: 'جدول المراجعات النهائية لطلاب الصفين الأول والثاني الإعدادي',
      description: 'تم رفع المذكرات التوجيهية ونماذج اختبارات الأعوام السابقة على منصة الطالب بصيغة PDF قابلة للتحميل مع الحل النموذجي.'
    },
    {
      day: '01',
      month: 'مايو',
      tag: 'النشاط الرياضي والعلمي • أول الشهر',
      title: 'فوز فريق المدرسة بالمركز الأول في مسابقة الابتكارات العلمية',
      description: 'تهنئ إدارة المدرسة أبناءنا الطلاب ومعلم مادة العلوم المشرف على مشروع توليد الطاقة النظيفة والتكريم على مستوى المحافظة.'
    }
  ];

  openStudentModal(): void {
    this.isStudentModalOpen.set(true);
    this.isTeacherModalOpen.set(false);
  }

  openTeacherModal(): void {
    this.isTeacherModalOpen.set(true);
    this.isStudentModalOpen.set(false);
  }

  closeModals(): void {
    this.isStudentModalOpen.set(false);
    this.isTeacherModalOpen.set(false);
  }

  submitStudentLogin(): void {
    this.closeModals();
    this.authService.quickLoginAs('STUDENT', {
      email: this.studentEmail(),
      fullName: 'عمر أحمد محمود',
      gradeLevel: 'الصف الثاني الإعدادي',
      className: 'فصل 2/3'
    });
  }

  submitTeacherLogin(): void {
    this.closeModals();
    this.authService.quickLoginAs('TEACHER', {
      nationalId: this.teacherNationalId(),
      fullName: 'أ. طارق عبد الحميد'
    });
  }

  submitAdminLogin(): void {
    this.closeModals();
    this.authService.quickLoginAs('ADMIN');
  }
}
