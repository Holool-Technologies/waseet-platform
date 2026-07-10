import { Injectable, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import { ToastService } from './toast.service';
import { LangService } from './lang.service';
import { environment } from '../../../environments/environment';
import { TranslateService } from '@ngx-translate/core';
import { ChatUnreadService } from './chat-unread.service';

@Injectable({ providedIn: 'root' })
export class HubService {
  private auth   = inject(AuthService);
  private notifs = inject(NotificationService);
  private toast  = inject(ToastService);
  private lang   = inject(LangService);
  private chatUnread = inject(ChatUnreadService);
  private hub: signalR.HubConnection | null = null;
  private handlers = new Map<string, Set<(data: any) => void>>();
  private connecting = false;
  private translate = inject(TranslateService); 
  async connect(): Promise<void> {
    if (this.hub?.state === signalR.HubConnectionState.Connected) return;
    if (this.connecting) {
      // Wait max 8 seconds for ongoing connection
      await new Promise<void>(resolve => {
        const check = setInterval(() => {
          if (this.hub?.state === signalR.HubConnectionState.Connected
              || !this.connecting) {
            clearInterval(check);
            resolve();
          }
        }, 100);
        setTimeout(() => { clearInterval(check); resolve(); }, 8000);
      });
      return;
    }

    this.connecting = true;

    this.hub = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.hubUrl}/hubs/waseet`, {
        accessTokenFactory: () => this.auth.token() ?? '',
        transport: signalR.HttpTransportType.WebSockets
                | signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect([0, 2000, 5000, 15000, 30000])
      .configureLogging(signalR.LogLevel.Error)  // reduce noise
      .build();

    // Notifications
    this.hub.on('ReceiveNotification', (payload: any) => {
      const isAr  = this.lang.isArabic();
      const title = isAr ? payload.titleAr : payload.titleEn;
      const body  = isAr ? payload.bodyAr  : payload.bodyEn;
      this.notifs.notifications.update(ns => [{
        notificationId: payload.notificationId,
        type: payload.type, title, body,
        relatedUrl: payload.relatedUrl,
        isRead: false,
        createdAt: payload.createdAt ?? new Date().toISOString()
      }, ...ns]);
      this.notifs.unreadCount.update(c => c + 1);
      this.toast.info(title, body);
    });

    // Chat — delegate to registered handlers
    this.hub.on('ReceiveMessage', (msg: any) => {
    this.emit('ReceiveMessage', msg);
      // Increment unread if not currently viewing that conversation
      if (!msg.blocked) {
        this.chatUnread.increment();
      }
    });
    this.hub.on('UserTyping',     (id: any)  => this.emit('UserTyping', id));
    this.hub.on('MessageBlocked', (r: any)   => this.emit('MessageBlocked', r));
    this.hub.on('Error',          (e: any)   => this.emit('Error', e));

    this.hub.onreconnected(async () => {
      this.toast.info(this.translate.instant('chatErrors.RECONNECTED'));
    });

  try {
      // Add explicit timeout — never hang forever
      const connectPromise = this.hub.start();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Hub connection timeout')), 10000));

      await Promise.race([connectPromise, timeoutPromise]);
      this.notifs.loadUnreadCount();
    } catch (err) {
      this.connecting = false;
     // this._logger.warn('Hub connection failed:', err);
     console.warn('Hub connection failed:', err);
      // Don't crash the app — hub is optional for auth flow
    } finally {
      this.connecting = false;
    }
  }

  // ── Conversation-scoped methods ──────────────────────────────
  async joinConversation(conversationId: string) {
    await this.ensureConnected();
    await this.hub?.invoke('JoinConversation', conversationId);
  }

  async leaveConversation(conversationId: string) {
    if (this.hub?.state === signalR.HubConnectionState.Connected)
      await this.hub.invoke('LeaveConversation', conversationId);
  }

  async sendMessage(conversationId: string, content: string) {
    await this.ensureConnected();
    await this.hub?.invoke('SendMessage', conversationId, content);
  }

  async sendFirstMessage(taskId: string, freelancerId: string, content: string) {
    await this.ensureConnected();
    await this.hub?.invoke('SendFirstMessage', taskId, freelancerId, content);
  }

  async sendTyping(conversationId: string) {
    if (this.hub?.state === signalR.HubConnectionState.Connected)
      await this.hub.invoke('Typing', conversationId);
  }

  // ── Event bus ───────────────────────────────────────────────
  on(event: string, handler: (data: any) => void) {
    if (!this.handlers.has(event))
      this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
  }

  off(event: string, handler: (data: any) => void) {
    this.handlers.get(event)?.delete(handler);
  }

  private emit(event: string, data: any) {
    this.handlers.get(event)?.forEach(h => h(data));
  }

  private async ensureConnected() {
    if (this.hub?.state !== signalR.HubConnectionState.Connected)
      await this.connect();
  }

  disconnect() { this.hub?.stop(); }
}