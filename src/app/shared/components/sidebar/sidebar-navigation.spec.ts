import { ErrorHandler, reflectComponentType } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../app.routes';
import { ADMIN_PERMISSIONS } from '../../../core/admin/admin-permissions';
import { AuthService } from '../../../core/auth/auth.service';
import { TokenService } from '../../../core/auth/token.service';
import { User, UserRole } from '../../../core/models/user.model';
import { SidebarComponent } from './sidebar.component';

/**
 * Every tab of the sidebar, for every kind of user, opens its own page through the real routes
 * and guards: no redirect, no error, and the page's component is on screen.
 * (The pages' API calls are left unanswered, so each one is checked in its loading state.)
 */
describe('Sidebar navigation', () => {
  let errors: unknown[];
  let defaultTimeout: number;

  // Opening every page of a role (each loaded on demand) takes longer than one ordinary test
  beforeAll(() => {
    defaultTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;
  });
  afterAll(() => (jasmine.DEFAULT_TIMEOUT_INTERVAL = defaultTimeout));

  async function setUp(role: UserRole, permissions?: string[]): Promise<RouterTestingHarness> {
    errors = [];
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        { provide: ErrorHandler, useValue: { handleError: (error: unknown) => errors.push(error) } }
      ]
    });
    const tokens = TestBed.inject(TokenService);
    spyOn(tokens, 'hasValidToken').and.returnValue(true);
    spyOn(tokens, 'hasTempToken').and.returnValue(false);
    TestBed.inject(AuthService).currentUser.set({
      id: `test-${role}`, nationalId: '00000000000000', fullName: 'مستخدم تجريبي', email: 'test@school.edu.eg',
      role, permissions, mustChangePassword: false, status: 'ACTIVE', schoolName: 'مدرسة تجريبية',
      createdAt: new Date().toISOString()
    } as User);
    return RouterTestingHarness.create();
  }

  /** The tabs this user can click, as the sidebar draws them */
  function sidebarLinks(role: UserRole): { links: string[]; disabled: string[] } {
    const fixture = TestBed.createComponent(SidebarComponent);
    fixture.componentRef.setInput('role', role);
    fixture.detectChanges();
    const sidebar = fixture.componentInstance;
    const items = sidebar.visibleNavItems();
    const links = items.filter(item => !sidebar.isDisabled(item)).map(item => sidebar.basePath() + item.route);
    const drawn = Array.from(fixture.nativeElement.querySelectorAll('a[href]'), a => (a as HTMLAnchorElement).getAttribute('href'));
    for (const link of links) expect(drawn).withContext(`link drawn for ${link}`).toContain(link);
    fixture.destroy();
    return { links, disabled: items.filter(item => sidebar.isDisabled(item)).map(item => item.label) };
  }

  function leafRoute(router: Router): ActivatedRoute {
    let route = router.routerState.root;
    while (route.firstChild) route = route.firstChild;
    return route;
  }

  async function expectEveryTabOpens(role: UserRole, permissions?: string[]): Promise<string[]> {
    const harness = await setUp(role, permissions);
    const router = TestBed.inject(Router);
    const { links } = sidebarLinks(role);
    expect(links.length).toBeGreaterThan(0);

    for (const link of links) {
      await harness.navigateByUrl(link);
      harness.detectChanges();
      expect(router.url).withContext(`${role}: ${link} stays on its page`).toBe(link);

      const page = leafRoute(router).component;
      expect(page).withContext(`${role}: ${link} has a page`).toBeTruthy();
      const selector = reflectComponentType(page!)!.selector;
      expect(harness.fixture.nativeElement.querySelector(selector)).withContext(`${role}: ${link} shows <${selector}>`).not.toBeNull();
      expect(errors).withContext(`${role}: ${link} opens without errors`).toEqual([]);
    }
    return links;
  }

  it('super admin: every tab opens', async () => {
    const links = await expectEveryTabOpens('SUPER_ADMIN');
    expect(links).toContain('/admin/admins');
  });

  it('admin with every section: every tab opens', async () => {
    const links = await expectEveryTabOpens('ADMIN', ADMIN_PERMISSIONS.map(p => p.key));
    expect(links).not.toContain('/admin/admins');
  });

  it('admin with no sections: only the open tabs show, and they open', async () => {
    const links = await expectEveryTabOpens('ADMIN', []);
    expect(links).toEqual(['/admin/dashboard', '/admin/subjects']);
  });

  it('teacher: every tab opens', async () => {
    const links = await expectEveryTabOpens('TEACHER');
    expect(links).toContain('/teacher/classes');
  });

  it('student: every tab opens', async () => {
    await expectEveryTabOpens('STUDENT');
  });

  it('parent: every tab opens', async () => {
    await expectEveryTabOpens('PARENT');
  });

  it('a section an admin was not granted sends them back to the dashboard', async () => {
    const harness = await setUp('ADMIN', []);
    await harness.navigateByUrl('/admin/students');
    expect(TestBed.inject(Router).url).toBe('/admin/dashboard');
  });

  it('the tabs that are switched off for now are shown but not clickable', async () => {
    await setUp('TEACHER');
    expect(sidebarLinks('TEACHER').disabled).toEqual(['فيديوهات الشرح']);
    TestBed.inject(AuthService).currentUser.update(user => ({ ...user!, role: 'SUPER_ADMIN' }));
    expect(sidebarLinks('SUPER_ADMIN').disabled).toEqual(['سجل رصد الدرجات']);
  });
});
