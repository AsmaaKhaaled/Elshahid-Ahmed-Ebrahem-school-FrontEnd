import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AttachmentDto {
  name: string;
  url: string;
}

export interface AnnouncementItemDto {
  id: string;
  title: string;
  content: string;
  category: 'عاجل وهام' | 'إداري' | 'أولياء الأمور' | 'أنشطة وفعاليات';
  audiences: Array<'TEACHER' | 'STUDENT' | 'PARENT'>;
  author: string;
  publishedAt: string;
  expiresAt?: string;
  pinned: boolean;
  attachment?: AttachmentDto;
  isRead?: boolean;
}

export interface CreateAnnouncementPayload {
  title: string;
  category: string;
  audiences: string[];
  content: string;
  author: string;
  expiresAt?: string;
  pinned: boolean;
  attachment?: AttachmentDto;
}

export interface UnreadCountResponse {
  status: string;
  data: {
    unreadCount: number;
  };
}

export interface AnnouncementsListResponse {
  status: string;
  message?: string;
  data: AnnouncementItemDto[];
}

export interface SingleAnnouncementResponse {
  status: string;
  message?: string;
  data: AnnouncementItemDto;
}

export interface ReadActionResponse {
  status: string;
  message?: string;
  data: {
    announcementId?: string;
    markedCount?: number;
    isRead?: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AnnouncementsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/announcements`;

  /**
   * Fetch announcements list targeted to the user, with isRead status
   * GET /api/v1/announcements?category=...&search=...
   */
  getAll(filter?: { category?: string; search?: string }): Observable<AnnouncementsListResponse> {
    let params = new HttpParams();
    if (filter?.category && filter.category !== 'الكل' && filter.category !== 'المنتهية') {
      params = params.set('category', filter.category);
    }
    if (filter?.search) {
      params = params.set('search', filter.search.trim());
    }
    return this.http.get<AnnouncementsListResponse>(this.baseUrl, { params });
  }

  /**
   * Fetch unread notifications count for the navbar badge
   * GET /api/v1/announcements/unread-count
   */
  getUnreadCount(): Observable<UnreadCountResponse> {
    return this.http.get<UnreadCountResponse>(`${this.baseUrl}/unread-count`);
  }

  /**
   * Publish a new announcement (Admin)
   * POST /api/v1/announcements
   */
  create(payload: CreateAnnouncementPayload): Observable<SingleAnnouncementResponse> {
    return this.http.post<SingleAnnouncementResponse>(this.baseUrl, payload);
  }

  /**
   * Mark a single announcement as read
   * POST /api/v1/announcements/:id/read
   */
  markAsRead(id: string): Observable<ReadActionResponse> {
    return this.http.post<ReadActionResponse>(`${this.baseUrl}/${id}/read`, {});
  }

  /**
   * Mark all visible announcements as read
   * POST /api/v1/announcements/read-all
   */
  markAllAsRead(): Observable<ReadActionResponse> {
    return this.http.post<ReadActionResponse>(`${this.baseUrl}/read-all`, {});
  }

  /**
   * Toggle pinned status of announcement
   * PATCH /api/v1/announcements/:id/pin
   */
  togglePinned(id: string): Observable<SingleAnnouncementResponse> {
    return this.http.patch<SingleAnnouncementResponse>(`${this.baseUrl}/${id}/pin`, {});
  }

  /**
   * Update an existing announcement
   * PUT /api/v1/announcements/:id
   */
  update(id: string, payload: Partial<CreateAnnouncementPayload>): Observable<SingleAnnouncementResponse> {
    return this.http.put<SingleAnnouncementResponse>(`${this.baseUrl}/${id}`, payload);
  }

  /**
   * Delete announcement
   * DELETE /api/v1/announcements/:id
   */
  delete(id: string): Observable<{ status: string; message?: string }> {
    return this.http.delete<{ status: string; message?: string }>(`${this.baseUrl}/${id}`);
  }
}
