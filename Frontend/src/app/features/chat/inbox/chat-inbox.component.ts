import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { ChatViewComponent } from '../chat-view/chat-view.component';
import { environment } from '../../../../environments/environment';

interface Conversation {
  conversationId: string;
  taskId: string;
  taskCode: string;
  taskTitle: string;
  otherPartyRole: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

@Component({
  selector: 'app-chat-inbox',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ChatViewComponent],
  template: `
    <div class="flex h-[calc(100vh-4rem)]">

      <!-- Sidebar — conversation list -->
      <div [class]="selected()
        ? 'hidden md:flex w-80 flex-col border-e border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900'
        : 'flex flex-col w-full md:w-80 border-e border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900'">

        <!-- Header -->
        <div class="px-4 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <h1 class="text-lg font-bold text-neutral-900 dark:text-white">Messages</h1>
          <p class="text-xs text-neutral-400 mt-0.5">
            {{ totalUnread() }} unread
          </p>
        </div>

        <!-- Search -->
        <div class="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800">
          <input
            [(ngModel)]="searchQuery"
            placeholder="Search conversations..."
            class="input text-sm py-2" />
        </div>

        <!-- Conversation list -->
        <div class="flex-1 overflow-y-auto">
          @if (loading()) {
            @for (i of [1,2,3,4,5]; track i) {
              <div class="flex items-center gap-3 px-4 py-3 animate-pulse">
                <div class="w-10 h-10 skeleton rounded-full flex-shrink-0"></div>
                <div class="flex-1">
                  <div class="h-3 skeleton rounded w-2/3 mb-2"></div>
                  <div class="h-2 skeleton rounded w-1/2"></div>
                </div>
              </div>
            }
          } @else if (filteredConversations().length === 0) {
            <div class="flex flex-col items-center justify-center py-16 px-4 text-center">
              <p class="text-3xl mb-3">💬</p>
              <p class="text-sm font-medium text-neutral-600 dark:text-neutral-300">No conversations yet</p>
              <p class="text-xs text-neutral-400 mt-1">Conversations appear when you're active on tasks</p>
            </div>
          } @else {
            @for (conv of filteredConversations(); track conv.conversationId) {
              <button
                (click)="selectConversation(conv)"
                [class]="selected()?.conversationId === conv.conversationId
                  ? 'w-full flex items-center gap-3 px-4 py-3 bg-brand-50 dark:bg-brand-900/20 border-e-2 border-brand-600'
                  : 'w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors'">

                <!-- Avatar -->
                <div class="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {{ conv.otherPartyRole === 'Client' ? 'C' : conv.otherPartyRole.charAt(0) }}
                </div>

                <div class="flex-1 min-w-0 text-start">
                  <div class="flex items-center justify-between mb-0.5">
                    <p class="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                      {{ conv.otherPartyRole }}
                    </p>
                    <p class="text-[10px] text-neutral-400 flex-shrink-0 ms-2">
                      {{ formatTime(conv.lastMessageAt) }}
                    </p>
                  </div>
                  <div class="flex items-center justify-between">
                    <p class="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                      {{ conv.lastMessage || 'No messages yet' }}
                    </p>
                    @if (conv.unreadCount > 0) {
                      <span class="ms-2 flex-shrink-0 w-5 h-5 bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {{ conv.unreadCount > 9 ? '9+' : conv.unreadCount }}
                      </span>
                    }
                  </div>
                  <p class="text-[10px] text-neutral-400 mt-0.5 truncate">
                    {{ conv.taskCode }} · {{ conv.taskTitle }}
                  </p>
                </div>
              </button>
            }
          }
        </div>
      </div>

      <!-- Chat area -->
      <div [class]="selected()
        ? 'flex flex-col flex-1'
        : 'hidden md:flex flex-col flex-1'">

        @if (!selected()) {
          <!-- Empty state — desktop -->
          <div class="flex flex-col items-center justify-center h-full text-center px-8">
            <div class="w-20 h-20 bg-brand-50 dark:bg-brand-900/20 rounded-3xl flex items-center justify-center mb-5">
              <svg class="w-10 h-10 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
              </svg>
            </div>
            <h2 class="text-xl font-bold text-neutral-700 dark:text-neutral-300">Your Messages</h2>
            <p class="text-sm text-neutral-400 mt-2 max-w-xs">
              Select a conversation to start messaging. All chats are anonymized and AI-protected.
            </p>
          </div>
        } @else {
          <!-- Chat header -->
          <div class="flex items-center gap-3 px-4 py-3 bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800">
            <!-- Back button on mobile -->
            <button (click)="selected.set(null)" class="md:hidden btn-ghost btn-sm p-2">
              ←
            </button>

            <div class="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
              {{ selected()!.otherPartyRole.charAt(0) }}
            </div>

            <div class="flex-1 min-w-0">
              <p class="font-semibold text-neutral-900 dark:text-white text-sm">
                {{ selected()!.otherPartyRole }}
              </p>
              <p class="text-xs text-neutral-400">
                {{ selected()!.taskCode }} · {{ selected()!.taskTitle }}
              </p>
            </div>

            <a [routerLink]="['/tasks', selected()!.taskCode]"
               class="btn-secondary btn-sm hidden sm:inline-flex">
              View Task →
            </a>
          </div>

          <!-- Embed the chat component -->
          <app-chat-view
            [taskId]="selected()!.taskId"
            class="flex-1 overflow-hidden">
          </app-chat-view>
        }
      </div>

    </div>
  `
})
export class ChatInboxComponent implements OnInit {
  private http   = inject(HttpClient);
  private router = inject(Router);
  auth           = inject(AuthService);

  conversations  = signal<Conversation[]>([]);
  selected       = signal<Conversation | null>(null);
  loading        = signal(true);
  searchQuery    = '';

  totalUnread = () =>
    this.conversations().reduce((acc, c) => acc + c.unreadCount, 0);

  filteredConversations = () =>
    this.conversations().filter(c =>
      !this.searchQuery ||
      c.taskTitle.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      c.taskCode.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      c.otherPartyRole.toLowerCase().includes(this.searchQuery.toLowerCase())
    );

  ngOnInit() {
    this.http.get<Conversation[]>(`${environment.apiUrl}/chat/inbox`).subscribe({
      next: c => { this.conversations.set(c); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  selectConversation(conv: Conversation) {
    this.selected.set(conv);
    // Clear unread
    this.conversations.update(cs =>
      cs.map(c => c.conversationId === conv.conversationId ? { ...c, unreadCount: 0 } : c));
  }

  formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000)   return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString('en', { day: 'numeric', month: 'short' });
  }
}