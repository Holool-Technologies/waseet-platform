import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface AppNotification {
  notificationId: string;
  type: string;
  title: string;
  body: string;
  relatedUrl?: string;
  isRead: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/notifications`;

  unreadCount = signal(0);
  notifications = signal<AppNotification[]>([]);

  loadUnreadCount() {
    this.http.get<{ unreadCount: number }>(`${this.base}/unread-count`)
      .subscribe(r => this.unreadCount.set(r.unreadCount));
  }

  load(lang: string, page = 1, pageSize = 20) {
    const params = new HttpParams()
      .set('lang', lang).set('page', page).set('pageSize', pageSize);
    this.http.get<AppNotification[]>(this.base, { params })
      .subscribe(n => this.notifications.set(n));
  }

  markAllRead() {
  // Fix 9: update UI immediately, then sync with server
  this.unreadCount.set(0);
  this.notifications.update(ns => ns.map(n => ({ ...n, isRead: true })));

  this.http.patch(`${this.base}/read-all`, {}).subscribe({
    error: () => {
      // Reload on failure to resync
      this.loadUnreadCount();
    }
  });
}

markRead(id: string) {
  // Fix 9: update UI immediately
  const wasUnread = this.notifications().find(n => n.notificationId === id && !n.isRead);
  if (wasUnread) {
    this.notifications.update(ns =>
      ns.map(n => n.notificationId === id ? { ...n, isRead: true } : n));
    this.unreadCount.update(c => Math.max(0, c - 1));
  }

  this.http.patch(`${this.base}/${id}/read`, {}).subscribe();
}

  pushReceived(notification: AppNotification) {
    this.notifications.update(ns => [notification, ...ns]);
    this.unreadCount.update(c => c + 1);
  }
}