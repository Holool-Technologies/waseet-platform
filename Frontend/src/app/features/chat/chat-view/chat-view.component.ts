import {
  Component, Input, inject, OnInit, OnDestroy,
  signal, ViewChild, ElementRef, AfterViewChecked, OnChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HubService } from '../../../core/services/hub.service';
import { AuthService } from '../../../core/services/auth.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface ChatMsg {
  messageId: string; taskId: string; senderRole: string;
  sanitizedContent: string; piiDetected: boolean; blocked: boolean; sentAt: string;
}

@Component({
  selector: 'app-chat-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col h-full bg-neutral-50 dark:bg-neutral-950">

      <!-- AI banner -->
      <div class="px-4 py-2 bg-brand-50 dark:bg-brand-900/20 border-b border-brand-100 dark:border-brand-900/50 flex items-center gap-2">
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
            <p class="text-xs text-neutral-400 mt-1">Your identity is protected</p>
          </div>
        }

        @for (msg of messages(); track msg.messageId) {
          @let mine = isMine(msg);
          <div [class]="mine ? 'flex justify-end' : 'flex justify-start'">
            <div class="max-w-[75%]">
              <p [class]="mine ? 'text-[10px] text-neutral-400 text-end mb-1 me-1' : 'text-[10px] text-neutral-400 ms-1 mb-1'">
                {{ mine ? 'You' : msg.senderRole }}
              </p>
              <div [class]="getBubbleClass(msg, mine)">
                @if (msg.blocked) {
                  <p class="text-xs italic opacity-70">⚠ Message blocked</p>
                } @else if (msg.piiDetected) {
                  <p class="text-[10px] opacity-60 mb-1">🔒 Personal info removed</p>
                }
                <p class="text-sm leading-relaxed break-words">{{ msg.sanitizedContent }}</p>
                <p [class]="mine ? 'text-[10px] opacity-60 text-end mt-1' : 'text-[10px] opacity-60 mt-1'">
                  {{ msg.sentAt | date:'HH:mm' }}
                </p>
              </div>
            </div>
          </div>
        }

        @if (isTyping()) {
          <div class="flex justify-start">
            <div class="bg-white dark:bg-neutral-800 rounded-2xl rounded-bl-sm px-4 py-3 border border-neutral-100 dark:border-neutral-700">
              <div class="flex gap-1 items-center">
                @for (i of [0,1,2]; track i) {
                  <div class="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce"
                    [style.animation-delay]="(i * 150) + 'ms'"></div>
                }
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Error -->
      @if (errorMsg()) {
        <div class="mx-3 mb-2 px-3 py-2 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 text-danger-600 dark:text-danger-400 text-xs rounded-xl flex items-center gap-2">
          <span>⚠</span> {{ errorMsg() }}
        </div>
      }

      <!-- Input -->
      <div class="px-3 py-3 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800">
        <div class="flex gap-2 items-end">
          <textarea
            [(ngModel)]="text"
            (keydown.enter)="onEnter($event)"
            (input)="onType()"
            [placeholder]="connected() ? 'Type a message...' : 'Connecting...'"
            [disabled]="!connected()"
            rows="1"
            class="input flex-1 resize-none text-sm py-2.5 max-h-28"
            style="field-sizing: content">
          </textarea>
          <button
            (click)="send()"
            [disabled]="!text.trim() || !connected() || text.length > 2000"
            class="btn-primary px-4 py-2.5 flex-shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>
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
  text = '';
  private shouldScroll = true;
  private typingTimer: any;

  // Handlers bound here so we can remove them on destroy
  private onMessage     = (msg: ChatMsg) => { this.messages.update(m => [...m, msg]); this.shouldScroll = true; };
  private onTyping      = () => { this.isTyping.set(true); clearTimeout(this.typingTimer); this.typingTimer = setTimeout(() => this.isTyping.set(false), 2000); };
  private onBlocked     = (r: string) => this.errorMsg.set(r);
  private onError       = (e: string) => { this.errorMsg.set(e); setTimeout(() => this.errorMsg.set(''), 4000); };

  ngOnInit() { this.init(); }

  ngOnChanges() {
    if (this.taskId) {
      this.messages.set([]);
      this.init();
    }
  }

  private async init() {
    await this.hub.connect();
    await this.hub.joinTask(this.taskId);
    this.connected.set(true);

    this.hub.on('ReceiveMessage', this.onMessage);
    this.hub.on('UserTyping',     this.onTyping);
    this.hub.on('MessageBlocked', this.onBlocked);
    this.hub.on('Error',          this.onError);

    this.loadHistory();
  }

  private loadHistory() {
    const params = new HttpParams().set('page', 1).set('pageSize', 50);
    this.http.get<ChatMsg[]>(`${environment.apiUrl}/chat/conversation/${this.taskId}`, { params })
      .subscribe({ next: msgs => { this.messages.set(msgs); this.shouldScroll = true; } });
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      try {
        this.container.nativeElement.scrollTop = this.container.nativeElement.scrollHeight;
        this.shouldScroll = false;
      } catch {}
    }
  }

  onEnter(e: KeyboardEvent) {
    if (!e.shiftKey) { e.preventDefault(); this.send(); }
  }

  onType() { this.hub.sendTyping(this.taskId); }

  async send() {
    const content = this.text.trim();
    if (!content || content.length > 2000) return;
    this.text = '';
    this.shouldScroll = true;
    await this.hub.sendMessage(this.taskId, content);
  }

  isMine(msg: ChatMsg): boolean {
    const user = this.auth.currentUser();
    if (!user) return false;
    // We use senderRole for display — client sees their own as "Client"
    return msg.senderRole === 'Client'
      ? user.role === 1
      : user.role === 2;
  }

  getBubbleClass(msg: ChatMsg, mine: boolean): string {
    if (msg.blocked)
      return 'px-4 py-2.5 rounded-2xl text-sm bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 text-danger-700 dark:text-danger-400 rounded-bl-sm';
    if (mine)
      return 'px-4 py-2.5 rounded-2xl text-sm bg-brand-600 text-white rounded-br-sm';
    return 'px-4 py-2.5 rounded-2xl text-sm bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-bl-sm';
  }

  ngOnDestroy() {
    this.hub.leaveTask(this.taskId);
    this.hub.off('ReceiveMessage', this.onMessage);
    this.hub.off('UserTyping',     this.onTyping);
    this.hub.off('MessageBlocked', this.onBlocked);
    this.hub.off('Error',          this.onError);
  }
}