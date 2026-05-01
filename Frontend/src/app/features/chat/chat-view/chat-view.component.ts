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
  senderUserId: string;   // ← use this for isMine()
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
    <div class="flex flex-col h-full bg-neutral-50 dark:bg-neutral-950">

      <!-- AI banner -->
      <div class="px-4 py-2 bg-brand-50 dark:bg-brand-900/20 border-b border-brand-100 dark:border-brand-900/50 flex items-center gap-2 flex-shrink-0">
        <span class="text-brand-500 text-sm flex-shrink-0">🛡</span>
        <p class="text-xs text-brand-700 dark:text-brand-300">
          Messages are AI-sanitized to protect anonymity
        </p>
      </div>

      <!-- Messages -->
      <div #container class="flex-1 overflow-y-auto px-4 py-4 space-y-2">

        @if (messages().length === 0 && connected()) {
          <div class="flex flex-col items-center justify-center h-full text-center py-8">
            <p class="text-3xl mb-3">👋</p>
            <p class="text-sm text-neutral-500">Start the conversation</p>
            <p class="text-xs text-neutral-400 mt-1">Your identity is protected throughout</p>
          </div>
        }

        @for (msg of messages(); track msg.messageId) {
          @let mine = isMine(msg);
          <div [class]="mine ? 'flex justify-end' : 'flex justify-start'" class="animate-fade-in">
            <div class="max-w-[75%]">
              <p [class]="mine
                ? 'text-[10px] text-neutral-400 text-end mb-1 me-1'
                : 'text-[10px] text-neutral-400 ms-1 mb-1'">
                {{ mine ? 'You' : msg.senderRole }}
              </p>
              <div [class]="getBubbleClass(msg, mine)">
                @if (msg.blocked) {
                  <p class="text-xs italic opacity-70">⚠ Message blocked</p>
                } @else {
                  @if (msg.piiDetected) {
                    <p class="text-[10px] opacity-60 mb-1">🔒 Personal info removed</p>
                  }
                  <p class="text-sm leading-relaxed break-words whitespace-pre-wrap">
                    {{ msg.sanitizedContent }}
                  </p>
                }
                <p [class]="mine
                  ? 'text-[10px] opacity-60 text-end mt-1'
                  : 'text-[10px] opacity-60 mt-1'">
                  {{ msg.sentAt | date:'HH:mm' }}
                </p>
              </div>
            </div>
          </div>
        }

        <!-- Typing indicator -->
        @if (isTyping()) {
          <div class="flex justify-start">
            <div class="bg-white dark:bg-neutral-800 rounded-2xl rounded-bl-sm px-4 py-3 border border-neutral-100 dark:border-neutral-700">
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

      <!-- Error toast inline -->
      @if (errorMsg()) {
        <div class="mx-3 mb-2 px-3 py-2 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 text-danger-600 dark:text-danger-400 text-xs rounded-xl flex items-center gap-2 flex-shrink-0">
          <span>⚠</span> {{ errorMsg() }}
        </div>
      }

      <!-- Input bar -->
      <div class="px-3 py-3 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800 flex-shrink-0">
        <div class="flex gap-2 items-end">
          <textarea
            [(ngModel)]="text"
            (keydown.enter)="onEnter($event)"
            (input)="onType()"
            [placeholder]="connected() ? 'Type a message...' : 'Connecting...'"
            [disabled]="!connected() || sending()"
            rows="1"
            class="input flex-1 resize-none text-sm py-2.5 max-h-28"
            style="field-sizing: content">
          </textarea>
          <button
            (click)="send()"
            [disabled]="!text.trim() || !connected() || text.length > 2000 || sending()"
            class="btn-primary px-4 py-2.5 flex-shrink-0 disabled:opacity-50">
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
        <p class="text-[10px] text-neutral-400 mt-1 text-end">{{ text.length }}/2000</p>
      </div>
    </div>
  `
})
export class ChatViewComponent implements OnInit, OnDestroy, AfterViewChecked, OnChanges {
  @Input() taskId!: string;
  @ViewChild('container') private container!: ElementRef<HTMLDivElement>;

  private hub  = inject(HubService);
  private auth = inject(AuthService);
  private http = inject(HttpClient);

  messages  = signal<ChatMsg[]>([]);
  connected = signal(false);
  isTyping  = signal(false);
  errorMsg  = signal('');
  sending   = signal(false);
  text      = '';

  private shouldScroll  = true;
  private typingTimer:  any;
  private seenIds       = new Set<string>();  // Fix 7: deduplication

  // Named handlers so we can remove them precisely
  private handleMessage = (msg: ChatMsg) => {
    // Fix 7: deduplicate by messageId
    if (this.seenIds.has(msg.messageId)) return;
    this.seenIds.add(msg.messageId);
    this.messages.update(m => [...m, msg]);
    this.shouldScroll = true;
    this.sending.set(false);
  };

  private handleTyping  = () => {
    this.isTyping.set(true);
    clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => this.isTyping.set(false), 2500);
  };

  private handleBlocked = (r: string) => {
    this.errorMsg.set(r);
    this.sending.set(false);
    setTimeout(() => this.errorMsg.set(''), 5000);
  };

  private handleError = (e: string) => {
    this.errorMsg.set(e);
    this.sending.set(false);
    setTimeout(() => this.errorMsg.set(''), 5000);
  };

  async ngOnInit() {
    await this.initHub();
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['taskId'] && !changes['taskId'].firstChange) {
      // Task changed — leave old, join new
      if (changes['taskId'].previousValue) {
        await this.hub.leaveTask(changes['taskId'].previousValue);
        this.hub.off('ReceiveMessage', this.handleMessage);
        this.hub.off('UserTyping',     this.handleTyping);
        this.hub.off('MessageBlocked', this.handleBlocked);
        this.hub.off('Error',          this.handleError);
      }
      this.messages.set([]);
      this.seenIds.clear();
      await this.initHub();
    }
  }

  private async initHub() {
    await this.hub.connect();
    await this.hub.joinTask(this.taskId);
    this.connected.set(true);

    this.hub.on('ReceiveMessage', this.handleMessage);
    this.hub.on('UserTyping',     this.handleTyping);
    this.hub.on('MessageBlocked', this.handleBlocked);
    this.hub.on('Error',          this.handleError);

    this.loadHistory();
  }

  private loadHistory() {
    const params = new HttpParams().set('page', 1).set('pageSize', 50);
    this.http.get<ChatMsg[]>(
      `${environment.apiUrl}/chat/conversation/${this.taskId}`,
      { params }
    ).subscribe({
      next: msgs => {
        // Seed seenIds so incoming SignalR dupes are caught
        msgs.forEach(m => this.seenIds.add(m.messageId));
        this.messages.set(msgs);
        this.shouldScroll = true;
      },
      error: () => {}
    });
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      try {
        const el = this.container.nativeElement;
        el.scrollTop = el.scrollHeight;
        this.shouldScroll = false;
      } catch {}
    }
  }

  onEnter(e: Event) {
    const keyboardEvent = e as KeyboardEvent;
    if (!keyboardEvent.shiftKey) { keyboardEvent.preventDefault(); this.send(); }
  }

  onType() {
    this.hub.sendTyping(this.taskId);
  }

  async send() {
    const content = this.text.trim();
    if (!content || content.length > 2000 || this.sending()) return;

    this.sending.set(true);
    const textToSend = content;
    this.text = '';  // Clear immediately for UX

    try {
      await this.hub.sendMessage(this.taskId, textToSend);
      // Message will arrive via ReceiveMessage handler
      // sending flag cleared there
    } catch {
      this.text = textToSend;  // Restore on error
      this.sending.set(false);
      this.errorMsg.set('Failed to send. Please try again.');
    }
  }

  // Fix 8: use senderUserId NOT senderRole for isMine()
  isMine(msg: ChatMsg): boolean {
    const userId = this.auth.currentUser()?.userId;
    if (!userId) return false;
    return msg.senderUserId === userId;
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
    this.hub.leaveTask(this.taskId);
    this.hub.off('ReceiveMessage', this.handleMessage);
    this.hub.off('UserTyping',     this.handleTyping);
    this.hub.off('MessageBlocked', this.handleBlocked);
    this.hub.off('Error',          this.handleError);
  }
}