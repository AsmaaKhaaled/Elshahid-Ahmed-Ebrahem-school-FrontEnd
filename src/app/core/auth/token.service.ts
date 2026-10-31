import { Injectable, signal } from '@angular/core';
import { TokenPayload } from '../models/auth-response.model';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private readonly ACCESS_TOKEN_KEY = 'sch_access_token';
  private readonly REFRESH_TOKEN_KEY = 'sch_refresh_token';
  private readonly TEMP_TOKEN_KEY = 'sch_temp_token';

  // Signals indicating token states
  readonly hasTokenSignal = signal<boolean>(this.hasValidToken());
  readonly hasTempTokenSignal = signal<boolean>(this.hasTempToken());

  getToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  getTempToken(): string | null {
    return sessionStorage.getItem(this.TEMP_TOKEN_KEY) || localStorage.getItem(this.TEMP_TOKEN_KEY);
  }

  setTokens(accessToken: string, refreshToken?: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    }
    this.clearTempToken();
    this.hasTokenSignal.set(true);
  }

  setTempToken(tempToken: string): void {
    sessionStorage.setItem(this.TEMP_TOKEN_KEY, tempToken);
    this.hasTempTokenSignal.set(true);
  }

  clearTempToken(): void {
    sessionStorage.removeItem(this.TEMP_TOKEN_KEY);
    localStorage.removeItem(this.TEMP_TOKEN_KEY);
    this.hasTempTokenSignal.set(false);
  }

  clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    this.clearTempToken();
    this.hasTokenSignal.set(false);
  }

  hasTempToken(): boolean {
    const temp = this.getTempToken();
    if (!temp) return false;
    const payload = this.decodeToken(temp);
    if (!payload || !payload.exp) return true;
    return Date.now() < payload.exp * 1000;
  }

  hasValidToken(): boolean {
    const token = this.getToken();
    if (!token) return false;
    
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) return true; // fallback if opaque token

    const isExpired = Date.now() >= payload.exp * 1000;
    return !isExpired;
  }

  decodeToken(token?: string | null): TokenPayload | null {
    const rawToken = token ?? this.getToken();
    if (!rawToken) return null;

    try {
      const parts = rawToken.split('.');
      if (parts.length !== 3) return null;
      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const decodedJson = decodeURIComponent(
        atob(payloadBase64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(decodedJson) as TokenPayload;
    } catch {
      return null;
    }
  }
}

