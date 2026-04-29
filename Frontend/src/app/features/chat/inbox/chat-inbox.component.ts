import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

interface Conversation {
  conversationId: string; taskId: string;
  taskCode: string; taskTitle: string;
  otherPartyRole: string; lastMessage: string;
  lastMessageAt: string; unreadCount: number;
}

@Component({
  selector: 'app-chat-inbox',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div class="page-sm">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="section-title">Messages</h1>
          <p class="section-sub">Your active conversations</p>
        </div>
      </div>

      @if (loading()) {
        <div class="space-y-3">
          @for (i of [1,2,3]; track i) {
            <div class="card p-4 animate-pulse flex gap-3">
              <div class="w-10 h-10 skeleton rounded-full flex-shrink-0"></div>
              <div class="flex-1"><div class="h-3 skeleton rounded w-1/2 mb-2"></div><div class="h-2 skeleton rounded w-3/4"></div></div>
            </div>
          }
        </div>
      } @else if (conversations().length === 0) {
        <div class="card p-12 text-center">
          <p class="text-4xl mb-4">💬</p>
          <p class="font-medium text-neutral-700 dark:text-neutral-300">No conversations yet</p>
          <p class="text-sm text-neutral-400 mt-2">Messages will appear here when you're active on a task</p>
          <a routerLink="/browse" class="btn-primary mt-6 inline-flex">Browse Tasks</a>
        </div>
      } @else {
        <div class="card overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800">
          @for (conv of conversations(); track conv.conversationId) {
            <a [routerLink]="['/chat', conv.taskId]"
               class="flex items-center gap-3 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">

              <div class="avatar-md flex-shrink-0">
                {{ conv.otherPartyRole === 'Client' ? '🏢' : '👤' }}
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-0.5">
                  <p class="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                    {{ conv.taskTitle }}
                  </p>
                  <p class="text-xs text-neutral-400 flex-shrink-0 ms-2">
                    {{ conv.lastMessageAt | date:'d MMM' }}
                  </p>
                </div>
                <div class="flex items-center justify-between">
                  <p class="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                    {{ conv.lastMessage || 'No messages yet' }}
                  </p>
                  @if (conv.unreadCount > 0) {
                    <span class="badge bg-brand-600 text-white ms-2 flex-shrink-0">
                      {{ conv.unreadCount }}
                    </span>
                  }
                </div>
                <p class="text-[10px] text-neutral-400 mt-0.5">
                  {{ conv.taskCode }} · with {{ conv.otherPartyRole }}
                </p>
              </div>

              <svg class="w-4 h-4 text-neutral-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </a>
          }
        </div>
      }
    </div>
  `
})
export class ChatInboxComponent implements OnInit {
  private http = inject(HttpClient);
  conversations = signal<Conversation[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.http.get<Conversation[]>(`${environment.apiUrl}/chat/inbox`).subscribe({
      next: c => { this.conversations.set(c); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
}