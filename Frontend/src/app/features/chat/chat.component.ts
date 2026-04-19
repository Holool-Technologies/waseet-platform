import {
  Component, inject, OnInit, OnDestroy,
  signal, ViewChild, ElementRef, AfterViewChecked, effect
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ChatService } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';
import { TaskService } from '../../core/services/task.service';
import { WaseetTask } from '../../core/models/task.models';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto">

      <!-- Chat header -->
      <div class="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
        <button (click)="goBack()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          ←
        </button>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-gray-900 dark:text-white truncate">
            {{ task()?.title ?? 'Loading...' }}
          </p>
          <p class="text-xs text-gray-400">{{ task()?.publicTaskCode }}</p>
        </div>
        <!-- Connection status -->
        <div class="flex items-center gap-1.5">
          <div [class]="chatService.isConnected()
            ? 'w-2 h-2 rounded-full bg-green-400'
            : 'w-2 h-2 rounded-full bg-red-400 animate-pulse'">
          </div>
          <span class="text-xs text-gray-400">
            {{ chatService.isConnected() ? 'Connected' : 'Connecting...' }}
          </span>
        </div>
      </div>

      <!-- AI protection banner -->
      <div class="bg-primary-50 dark:bg-primary-900/20 border-b border-primary-100 dark:border-primary-800 px-4 py-2 flex items-center gap-2">
        <span class="text-primary-500 flex-shrink-0">🛡</span>
        <p class="text-xs text-primary-700 dark:text-primary-300">
          {{ 'chat.aiNote' | translate }}
        </p>
      </div>

      <!-- Messages area -->
      <div #messagesContainer
        class="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        [class.justify-center]="chatService.messages().length === 0">

        @if (chatService.messages().length === 0 && chatService.isConnected()) {
          <div class="flex flex-col items-center justify-center h-full text-center py-12">
            <div class="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <span class="text-3xl">💬</span>
            </div>
            <p class="font-medium text-gray-700 dark:text-gray-300">Start the conversation</p>
            <p class="text-sm text-gray-400 mt-1">Your identity is protected throughout.</p>
          </div>
        }

        @for (msg of chatService.messages(); track msg.messageId) {
          @let isMe = isMine(msg.senderRole);
          <div [class]="isMe ? 'flex justify-end' : 'flex justify-start'">
            <div class="max-w-xs lg:max-w-md xl:max-w-lg">

              <!-- Role label -->
              <p [class]="isMe
                ? 'text-xs text-gray-400 text-end mb-1 me-1'
                : 'text-xs text-gray-400 text-start mb-1 ms-1'">
                {{ isMe ? 'You' : msg.senderRole }}
              </p>

              <!-- Bubble -->
              <div [class]="getBubbleClass(msg, isMe)">
                <!-- Blocked / PII indicator -->
                @if (msg.blocked) {
                  <div class="flex items-center gap-1.5 mb-1">
                    <span class="text-xs">⚠</span>
                    <span class="text-xs font-medium opacity-80">Message blocked</span>
                  </div>
                } @else if (msg.piiDetected) {
                  <div class="flex items-center gap-1 mb-1">
                    <span class="text-xs opacity-70">🔒 PII removed</span>
                  </div>
                }

                <p class="text-sm leading-relaxed break-words">{{ msg.sanitizedContent }}</p>

                <p [class]="isMe
                  ? 'text-xs mt-1 text-end opacity-60'
                  : 'text-xs mt-1 text-start opacity-60'">
                  {{ msg.sentAt | date:'HH:mm' }}
                </p>
              </div>
            </div>
          </div>
        }

        <!-- Typing indicator -->
        @if (chatService.isTyping()) {
          <div class="flex justify-start">
            <div class="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-bl-sm px-4 py-3">
              <div class="flex gap-1 items-center">
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay:0ms"></div>
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay:150ms"></div>
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay:300ms"></div>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Error toast -->
      @if (chatService.connectionError()) {
        <div class="mx-4 mb-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm px-4 py-2.5 rounded-xl flex items-center gap-2">
          <span>⚠</span> {{ chatService.connectionError() }}
        </div>
      }

      <!-- Input area -->
      <div class="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-4 py-3">
        <div class="flex gap-2 items-end">
          <div class="flex-1 relative">
            <textarea
              [(ngModel)]="messageText"
              (keydown.enter)="onEnter($event)"
              (input)="onInput()"
              [placeholder]="'chat.typeMessage' | translate"
              [disabled]="!chatService.isConnected()"
              rows="1"
              class="input-field resize-none overflow-hidden max-h-32 text-sm py-2.5 leading-relaxed"
              style="field-sizing: content;">
            </textarea>
            <div class="absolute end-2 bottom-2 text-xs text-gray-300 dark:text-gray-600">
              {{ messageText.length }}/2000
            </div>
          </div>
          <button
            (click)="send()"
            [disabled]="!messageText.trim() || !chatService.isConnected() || messageText.length > 2000"
            class="btn-primary px-4 py-2.5 text-sm flex-shrink-0 disabled:opacity-50">
            {{ 'chat.send' | translate }}
          </button>
        </div>
        <p class="text-xs text-gray-400 mt-1.5 text-center">
          Messages are AI-reviewed to protect your anonymity
        </p>
      </div>
    </div>
  `
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private container!: ElementRef<HTMLDivElement>;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private taskService = inject(TaskService);
  chatService = inject(ChatService);
  auth = inject(AuthService);

  messageText = '';
  task = signal<WaseetTask | null>(null);
  private taskId = '';
  private shouldScroll = true;

  ngOnInit() {
    this.taskId = this.route.snapshot.paramMap.get('taskId')!;
    this.taskService.getByCode(this.taskId).subscribe(t => this.task.set(t));
    this.chatService.connect(this.taskId);
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) this.scrollToBottom();
  }

  onEnter(e: Event) {
    const keyboardEvent = e as KeyboardEvent;
    if (!keyboardEvent.shiftKey) { keyboardEvent.preventDefault(); this.send(); }
  }

  onInput() {
    this.chatService.sendTyping(this.taskId);
  }

  async send() {
    const text = this.messageText.trim();
    if (!text || text.length > 2000) return;
    this.messageText = '';
    this.shouldScroll = true;
    await this.chatService.send(this.taskId, text);
  }

  goBack() { this.router.navigate(['/tasks', this.task()?.publicTaskCode ?? '']); }

  isMine(role: string): boolean {
    const user = this.auth.currentUser();
    if (!user || !this.task()) return false;
    return (role === 'Client' && this.task()!.clientUserId === user.userId) ||
           (role === 'Freelancer' && this.task()!.freelancerUserId === user.userId);
  }

  getBubbleClass(msg: any, isMe: boolean): string {
    const base = 'px-4 py-2.5 rounded-2xl text-sm';
    if (msg.blocked)
      return `${base} bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-bl-sm text-red-700 dark:text-red-400`;
    if (isMe)
      return `${base} bg-primary-500 text-white rounded-br-sm`;
    return `${base} bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-sm`;
  }

  private scrollToBottom() {
    try {
      const el = this.container.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScroll = false;
    } catch {}
  }

  ngOnDestroy() { this.chatService.disconnect(this.taskId); }
}