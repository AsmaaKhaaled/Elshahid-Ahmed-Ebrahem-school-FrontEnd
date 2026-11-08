import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  // Base URL for Backend API
  private readonly baseUrl = 'http://localhost:5000/api/v1';

  get<T>(endpoint: string, params?: Record<string, string | number | boolean | readonly (string | number | boolean)[]>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        const val = params[key];
        if (val !== undefined && val !== null) {
          httpParams = httpParams.set(key, String(val));
        }
      });
    }
    return this.http.get<T>(`${this.baseUrl}/${this.cleanEndpoint(endpoint)}`, { params: httpParams });
  }

  /** A file from the API (e.g. a download that needs the sign-in token). */
  getBlob(endpoint: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${this.cleanEndpoint(endpoint)}`, { responseType: 'blob' });
  }

  // `context` tunes the toasts (see notify.interceptor: SILENT_REQUEST, SUCCESS_MESSAGE)
  post<T>(endpoint: string, body: any, headers?: HttpHeaders, context?: HttpContext): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/${this.cleanEndpoint(endpoint)}`, body, { headers, context });
  }

  put<T>(endpoint: string, body: any, context?: HttpContext): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}/${this.cleanEndpoint(endpoint)}`, body, { context });
  }

  patch<T>(endpoint: string, body: any, context?: HttpContext): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}/${this.cleanEndpoint(endpoint)}`, body, { context });
  }

  delete<T>(endpoint: string, context?: HttpContext): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}/${this.cleanEndpoint(endpoint)}`, { context });
  }

  private cleanEndpoint(endpoint: string): string {
    return endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  }
}

