import { Injectable, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private readonly auth = inject(AuthService);
  private socket?: Socket;

  connect(): Socket {
    if (this.socket?.connected) return this.socket;

    if (this.socket) {
      this.socket.connect();
      return this.socket;
    }

    const token = this.auth.token();
    const serverUrl = environment.apiUrl.replace(/\/api\/v1\/?$/, '');

    this.socket = io(serverUrl, {
      auth: { token: token ? `Bearer ${token}` : '' },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    return this.socket;
  }

  onAnnouncement(callback: (announcement: any) => void): () => void {
    const s = this.connect();
    s.on('announcement:new', callback);
    return () => s.off('announcement:new', callback);
  }

  onNotification(callback: (notification: any) => void): () => void {
    const s = this.connect();
    s.on('notification:new', callback);
    return () => s.off('notification:new', callback);
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = undefined;
  }
}

