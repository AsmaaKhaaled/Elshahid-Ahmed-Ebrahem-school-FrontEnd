import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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

export interface GallerySlideResponse {
  status: string;
  data: GallerySlide;
  message?: string;
}

export interface GallerySlidesListResponse {
  status: string;
  data: GallerySlide[];
}

@Injectable({ providedIn: 'root' })
export class HomeContentApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.includes('/api/v1')
    ? `${environment.apiUrl}/home-content`
    : `${environment.apiUrl}/api/v1/home-content`;

  // --- كلمة المدير (Principal's Word) ---
  getHomeContent(): Observable<HomeContentResponse> {
    return this.http.get<HomeContentResponse>(this.baseUrl);
  }

  getPrincipalWord(): Observable<PrincipalWordResponse> {
    return this.http.get<PrincipalWordResponse>(`${this.baseUrl}/principal`);
  }

  updatePrincipalWord(payload: PrincipalWord): Observable<PrincipalWordResponse> {
    return this.http.put<PrincipalWordResponse>(`${this.baseUrl}/principal`, payload);
  }

  // --- صور الأنشطة المدرسية (School Gallery Slides) ---
  getGallerySlides(includeHidden = false): Observable<GallerySlidesListResponse> {
    const params = new HttpParams().set('includeHidden', includeHidden.toString());
    return this.http.get<GallerySlidesListResponse>(`${this.baseUrl}/gallery`, { params });
  }

  createGallerySlide(payload: { title: string; caption?: string; src: string; hidden?: boolean }): Observable<GallerySlideResponse> {
    return this.http.post<GallerySlideResponse>(`${this.baseUrl}/gallery`, payload);
  }

  updateGallerySlide(id: string, payload: Partial<GallerySlide>): Observable<GallerySlideResponse> {
    return this.http.put<GallerySlideResponse>(`${this.baseUrl}/gallery/${id}`, payload);
  }

  toggleHiddenSlide(id: string): Observable<{ status: string; data: { id: string; hidden: boolean } }> {
    return this.http.patch<{ status: string; data: { id: string; hidden: boolean } }>(`${this.baseUrl}/gallery/${id}/toggle-hidden`, {});
  }

  reorderGallerySlides(slideIds: string[]): Observable<{ status: string; message: string }> {
    return this.http.put<{ status: string; message: string }>(`${this.baseUrl}/gallery/reorder`, { slideIds });
  }

  deleteGallerySlide(id: string): Observable<{ status: string; message: string; data: { id: string } }> {
    return this.http.delete<{ status: string; message: string; data: { id: string } }>(`${this.baseUrl}/gallery/${id}`);
  }
}
