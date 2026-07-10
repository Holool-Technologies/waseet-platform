import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ChatUnreadService {
  private http = inject(HttpClient);

  unreadCount = signal(0);

  load() {
    this.http.get<{ unreadCount: number }>(
      `${environment.apiUrl}/chat/unread-count`
    ).subscribe({ next: r => this.unreadCount.set(r.unreadCount) });
  }

  increment() { this.unreadCount.update(c => c + 1); }

  resetForConversation(prevCount: number) {
    this.unreadCount.update(c => Math.max(0, c - prevCount));
  }
}