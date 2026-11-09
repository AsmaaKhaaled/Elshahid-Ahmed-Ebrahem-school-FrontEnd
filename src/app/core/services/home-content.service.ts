import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PrincipalWord, GallerySlide } from '../../features/home-content/home-content.model';

export interface HomeContentResponse {
  status: string;
  data: {
    principal: PrincipalWord;
    slides?: GallerySlide[];
  };
}

export interface PrincipalWordResponse {
  status: string;
  data: PrincipalWord;
}

@Injectable({ providedIn: 'root' })
export class HomeContentApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.includes('/api/v1')
    ? `${environment.apiUrl}/home-content`
    : `${environment.apiUrl}/api/v1/home-content`;

  getHomeContent(): Observable<HomeContentResponse> {
    return this.http.get<HomeContentResponse>(this.baseUrl);
  }

  getPrincipalWord(): Observable<PrincipalWordResponse> {
    return this.http.get<PrincipalWordResponse>(`${this.baseUrl}/principal`);
  }

  updatePrincipalWord(payload: PrincipalWord): Observable<PrincipalWordResponse> {
    return this.http.put<PrincipalWordResponse>(`${this.baseUrl}/principal`, payload);
  }
}

