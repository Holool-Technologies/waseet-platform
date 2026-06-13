import {
  Component, Input, inject, OnInit, OnDestroy,
  signal, ViewChild, ElementRef, AfterViewChecked, OnChanges, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { HubService } from '../../../core/services/hub.service';
import { environment } from '../../../../environments/environment';

export interface ChatMsg {
  messageId: string;
  taskId: string;
  conversationId: string;
  senderUserId: string;
  senderRole: string;
  sanitizedContent: string;
  piiDetected: boolean;
  blocked: boolean;
  sentAt: string;
}

@Component({
  selector: 'app-chat-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col h-full">

      <!-- AI protection banner -->
      <div class="px-4 py-2 bg-brand-50 dark:bg-brand-900/20 border-b border-brand-100 dark:border-brand-900 flex items-center gap-2 flex-shrink-0">
        <span class="text-brand-500 flex-shrink-0">🛡</span>
        <p class="text-xs text-brand-700 dark:text-brand-300">
          All messages are AI-sanitized to protect your identity
        </p>
      </div>

      <!-- Messages container -->
      <div #container
        class="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-neutral-50 dark:bg-neutral-950">

        @if (historyLoading()) {
          <div class="flex items-center justify-center h-full">
            <div class="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        } @else if (messages().length === 0) {
          <div class="flex flex-col items-center justify-center h-full text-center py-8">
            <p class="text-3xl mb-3">👋</p>
            <p class="text-sm font-medium text-neutral-600 dark:text-neutral-300">Start the conversation</p>
            <p class="text-xs text-neutral-400 mt-1">Your real identity stays protected</p>
          </div>
        } @else {
          @for (msg of messages(); track msg.messageId) {
            @let mine = isMine(msg);
            <div [class]="mine ? 'flex justify-end' : 'flex justify-start'"
              class="animate-fade-in">
              <div class="max-w-[75%]">
                <p [class]="mine
                  ? 'text-[10px] text-neutral-400 text-end mb-0.5 me-1'
                  : 'text-[10px] text-neutral-400 ms-1 mb-0.5'">
                  {{ mine ? 'You' : msg.senderRole }}
                </p>
                <div [class]="getBubbleClass(msg, mine)">
                  @if (msg.blocked) {
                    <p class="text-xs italic opacity-70 flex items-center gap-1">
                      <span>⚠</span> Message blocked
                    </p>
                  } @else {
                    @if (msg.piiDetected) {
                      <p class="text-[10px] opacity-60 mb-1 flex items-center gap-1">
                        <span>🔒</span> Personal info removed
                      </p>
                    }
                    <p class="text-sm leading-relaxed break-words whitespace-pre-wrap">
                      {{ msg.sanitizedContent }}
                    </p>
                  }
                  <p [class]="mine
                    ? 'text-[10px] opacity-60 text-end mt-1'
                    : 'text-[10px] opacity-60 mt-1'">
                    <!-- Fix 10: date shown as UTC -->
                    {{ formatTime(msg.sentAt) }}
                  </p>
                </div>
              </div>
            </div>
          }
        }

        <!-- Typing indicator -->
        @if (isTyping()) {
          <div class="flex justify-start animate-fade-in">
            <div class="bg-white dark:bg-neutral-800 rounded-2xl rounded-bl-sm px-4 py-3 border border-neutral-100 dark:border-neutral-700 shadow-sm">
              <div class="flex gap-1 items-center">
                @for (i of [0,1,2]; track i) {
                  <div class="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce"
                    [style.animation-delay]="(i * 150) + 'ms'">
                  </div>
                }
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Error banner -->
      @if (errorMsg()) {
        <div class="mx-3 mb-1 px-3 py-2 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 text-danger-600 dark:text-danger-400 text-xs rounded-xl flex items-center justify-between flex-shrink-0">
          <span class="flex items-center gap-1.5"><span>⚠</span> {{ errorMsg() }}</span>
          <button (click)="errorMsg.set('')" class="opacity-60 hover:opacity-100 ms-2">✕</button>
        </div>
      }

      <!-- Input -->
      <div class="px-3 py-3 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800 flex-shrink-0">
        <div class="flex gap-2 items-end">
          <textarea
            [(ngModel)]="text"
            (keydown.enter)="onEnter($event)"
            (input)="onType()"
            [placeholder]="connected() ? 'Type a message...' : 'Connecting...'"
            [disabled]="!connected()"
            rows="1"
            class="input flex-1 resize-none text-sm py-2.5 min-h-[42px] max-h-28"
            style="field-sizing: content">
          </textarea>
          <button
            (click)="send()"
            [disabled]="!canSend()"
            class="btn-primary w-10 h-10 p-0 flex-shrink-0 rounded-xl disabled:opacity-50 flex items-center justify-center">
            @if (sending()) {
              <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            } @else {
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
              </svg>
            }
          </button>
        </div>
        @if (text.length > 1800) {
          <p class="text-[10px] text-warning-500 mt-1 text-end">{{ text.length }}/2000</p>
        }
      </div>
    </div>
  `
})
export class ChatViewComponent implements OnInit, OnDestroy, AfterViewChecked, OnChanges {
  @Input() conversationId!: string;
  @Input() taskId?: string;
  @Input() freelancerUserId?: string;  // for first message
  @Input() isFirstMessage = false;

  @ViewChild('container') private container!: ElementRef<HTMLDivElement>;

  private hub  = inject(HubService);
  private auth = inject(AuthService);
  private http = inject(HttpClient);

  messages       = signal<ChatMsg[]>([]);
  connected      = signal(false);
  isTyping       = signal(false);
  historyLoading = signal(true);
  errorMsg       = signal('');
  sending        = signal(false);
  text           = '';

  private seenIds      = new Set<string>();
  private shouldScroll = true;
  private typingTimer: any;

  // Fix infinite loading — timeout fallback
  private sendTimeout: any;

  canSend = () =>
    !!this.text.trim() &&
    this.connected() &&
    !this.sending() &&
    this.text.length <= 2000;

  // Named handlers
  private onMessage = (msg: ChatMsg) => {
  if (this.seenIds.has(msg.messageId)) return;
  if (msg.conversationId !== this.conversationId) return;

  this.seenIds.add(msg.messageId);
  this.messages.update(m => [...m, msg]);
  this.shouldScroll = true;
  this.sending.set(false);
  clearTimeout(this.sendTimeout);

  // If the message is from the other party and the chat is open,
  // immediately mark it as read so the counter stays zero
  if (!this.isMine(msg)) {
    this.markRead();
  }
};

// Add this method to ChatViewComponent:
 private markRead(): void {
   if (!this.conversationId) return;
   this.http.post(
    `${environment.apiUrl}/chat/conversation/${this.conversationId}/read`,
    {}
  ).subscribe({
    error: err => console.warn('Mark read on receive failed:', err)
  });
}

  private onTyping = (convId: string) => {
    if (convId !== this.conversationId) return;
    this.isTyping.set(true);
    clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => this.isTyping.set(false), 2500);
  };

  private onBlocked = (r: string) => {
    this.errorMsg.set(r);
    this.sending.set(false);
    clearTimeout(this.sendTimeout);
  };

  private onError = (e: string) => {
    this.errorMsg.set(e);
    this.sending.set(false);
    clearTimeout(this.sendTimeout);
  };

  async ngOnInit() { await this.init(); }

  async ngOnChanges(c: SimpleChanges) {
    if (c['conversationId'] && !c['conversationId'].firstChange) {
      const prev = c['conversationId'].previousValue;
      if (prev) {
        await this.hub.leaveConversation(prev);
        this.hub.off('ReceiveMessage', this.onMessage);
        this.hub.off('UserTyping',     this.onTyping);
        this.hub.off('MessageBlocked', this.onBlocked);
        this.hub.off('Error',          this.onError);
      }
      this.messages.set([]);
      this.seenIds.clear();
      this.historyLoading.set(true);
      await this.init();
    }
  }

  private async init() {
    // alert(JSON.stringify({ conversationId: this.conversationId, taskId: this.taskId, freelancerUserId: this.freelancerUserId, isFirstMessage: this.isFirstMessage }));

    if (!this.conversationId) return;
    // alert(JSON.stringify({ conversationId: this.conversationId, taskId: this.taskId, freelancerUserId: this.freelancerUserId, isFirstMessage: this.isFirstMessage }));

    await this.hub.connect();
    await this.hub.joinConversation(this.conversationId);
    this.connected.set(true);

    this.hub.on('ReceiveMessage', this.onMessage);
    this.hub.on('UserTyping',     this.onTyping);
    this.hub.on('MessageBlocked', this.onBlocked);
    this.hub.on('Error',          this.onError);

    // Don't load history for a brand-new conversation
    if (!this.isFirstMessage) {
      this.loadHistory();
    } else {
      this.historyLoading.set(false);
    }
  }

  private loadHistory() {
    this.historyLoading.set(true);
    const params = new HttpParams().set('page', 1).set('pageSize', 1000);
    this.http.get<ChatMsg[]>(
      `${environment.apiUrl}/chat/conversation/${this.conversationId}/messages`,
      { params }
    ).subscribe({
      next: msgs => {
        msgs.forEach(m => this.seenIds.add(m.messageId));
        // msgs.forEach(m => alert(JSON.stringify(m)));
        this.messages.set(msgs);
        this.shouldScroll = true;
        this.historyLoading.set(false);
      },
      error: (err) => {
        this.historyLoading.set(false);
        if (err.status === 403) {
          this.errorMsg.set('Access denied to this conversation.');
        } else if (err.status === 404) {
          this.historyLoading.set(false); // new conversation — no history
        }
      }
    });
  }

  ngAfterViewChecked() {
    if (this.shouldScroll && !this.historyLoading()) {
      try {
        const el = this.container?.nativeElement;
        if (el) { el.scrollTop = el.scrollHeight; this.shouldScroll = false; }
      } catch {}
    }
  }

  onEnter(e: Event) {
    const keyboardEvent = e as KeyboardEvent;
    if (!keyboardEvent.shiftKey) { keyboardEvent.preventDefault(); this.send(); }
  }

  onType() {
    if (this.conversationId)
      this.hub.sendTyping(this.conversationId);
  }

  async send() {
    if (!this.canSend()) return;

    const content = this.text.trim();
    this.text     = '';
    this.sending.set(true);
    this.errorMsg.set('');

    // Fix infinite loading — timeout fallback after 10s
    clearTimeout(this.sendTimeout);
    this.sendTimeout = setTimeout(() => {
      if (this.sending()) {
        this.sending.set(false);
        this.text = content;  // restore
        this.errorMsg.set('Send timed out. Please try again.');
      }
    }, 10000);

    try {
      if (this.isFirstMessage && this.taskId && this.freelancerUserId) {
        // First message — creates conversation lazily
        await this.hub.sendFirstMessage(
          this.taskId, this.freelancerUserId, content);
        this.isFirstMessage = false;
      } else {
        await this.hub.sendMessage(this.auth.currentUser()?.userId ?? '', this.conversationId, content);
      }
    } catch (err) {
      this.sending.set(false);
      clearTimeout(this.sendTimeout);
      this.text = content;
      this.errorMsg.set('Failed to send. Please try again.');
    }
  }

  // Fix 8: use senderUserId for isMine
  isMine(msg: ChatMsg): boolean {
    return msg.senderUserId === this.auth.currentUser()?.userId;
  }

  // Fix 10: format UTC dates correctly
  formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], {
      hour:   '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  }

  getBubbleClass(msg: ChatMsg, mine: boolean): string {
    if (msg.blocked)
      return 'px-4 py-2.5 rounded-2xl text-sm bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 text-danger-700 dark:text-danger-400 rounded-bl-sm';
    if (mine)
      return 'px-4 py-2.5 rounded-2xl text-sm bg-brand-600 text-white rounded-br-sm shadow-sm';
    return 'px-4 py-2.5 rounded-2xl text-sm bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-bl-sm shadow-sm';
  }

  ngOnDestroy() {
    clearTimeout(this.typingTimer);
    clearTimeout(this.sendTimeout);
    if (this.conversationId)
      this.hub.leaveConversation(this.conversationId);
    this.hub.off('ReceiveMessage', this.onMessage);
    this.hub.off('UserTyping',     this.onTyping);
    this.hub.off('MessageBlocked', this.onBlocked);
    this.hub.off('Error',          this.onError);
  }
}