import { Component, inject, OnInit, OnDestroy, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ChatService } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="max-w-3xl mx-auto px-4 py-6 flex flex-col h-[calc(100vh-4rem)]">
      <!-- AI note banner -->
      <div class="bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2">
        <span class="text-primary-500 text-sm">🛡</span>
        <p class="text-xs text-primary-700 dark:text-primary-300">{{ 'chat.aiNote' | translate }}</p>
      </div>

      <!-- Messages -->
      <div #scrollContainer class="flex-1 overflow-y-auto space-y-3 pb-4">
        @for (msg of chatService.messages(); track msg.messageId) {
          <div [class]="msg.senderUserId === auth.currentUser()?.userId ? 'flex justify-end' : 'flex justify-start'">
            <div [class]="msg.senderUserId === auth.currentUser()?.userId
              ? 'bg-primary-500 text-white rounded-2xl rounded-br-sm px-4 py-2.5 max-w-xs lg:max-w-md'
              : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-xs lg:max-w-md'">
              <p class="text-sm">{{ msg.sanitizedContent }}</p>
              <p [class]="msg.senderUserId === auth.currentUser()?.userId
                ? 'text-xs text-primary-200 mt-1'
                : 'text-xs text-gray-400 mt-1'">
                {{ msg.sentAt | date:'shortTime' }}
              </p>
            </div>
          </div>
        }

        @if (chatService.messages().length === 0) {
          <div class="flex items-center justify-center h-full text-gray-400 text-sm">
            No messages yet. Start the conversation.
          </div>
        }
      </div>

      <!-- Input -->
      <div class="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
        <input
          [(ngModel)]="messageText"
          (keyup.enter)="send()"
          [placeholder]="'chat.typeMessage' | translate"
          class="input-field flex-1"
          [disabled]="!chatService.isConnected()" />
        <button (click)="send()" class="btn-primary px-6"
          [disabled]="!messageText.trim() || !chatService.isConnected()">
          {{ 'chat.send' | translate }}
        </button>
      </div>
    </div>
  `
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  private route = inject(ActivatedRoute);
  chatService = inject(ChatService);
  auth = inject(AuthService);
  messageText = '';
  private taskId = '';

  ngOnInit() {
    this.taskId = this.route.snapshot.paramMap.get('taskId')!;
    this.chatService.connect(this.taskId);
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  send() {
    if (!this.messageText.trim()) return;
    this.chatService.send(this.taskId, this.messageText);
    this.messageText = '';
  }

  ngOnDestroy() {
    this.chatService.disconnect(this.taskId);
  }

  private scrollToBottom() {
    try { this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight; }
    catch {}
  }
}