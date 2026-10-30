import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EnvironmentProviders, Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { AuthService } from '../app/core/auth/auth.service';
import { User, UserRole } from '../app/core/models/user.model';

/** Providers most components need in tests (router, HTTP for AuthService, Material animations). */
export function provideTestDefaults(): (Provider | EnvironmentProviders)[] {
  return [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()];
}

/** Signs in a fake user with the given role (call after TestBed is configured). */
export function loginAs(role: UserRole): void {
  TestBed.inject(AuthService).currentUser.set({
    id: `test-${role}`,
    nationalId: '00000000000000',
    fullName: 'مستخدم تجريبي',
    email: 'test@school.edu.eg',
    role,
    mustChangePassword: false,
    status: 'ACTIVE',
    schoolName: 'مدرسة تجريبية',
    createdAt: new Date().toISOString()
  } as User);
}
