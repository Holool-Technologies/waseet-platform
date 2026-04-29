import { Injectable, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import { ToastService } from './toast.service';
import { LangService } from './lang.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class HubService {
  private auth   = inject(AuthService);
  private notifs = inject(NotificationService);
  private toast  = inject(ToastService);
  private lang   = inject(LangService);
  private hub: signalR.HubConnection | null = null;

  private messageHandlers = new Map<string, ((msg: any) => void)[]>();

  async connect() {
    if (this.hub?.state === signalR.HubConnectionState.Connected) return;

    this.hub = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.hubUrl}/hubs/waseet`, {
        accessTokenFactory: () => this.auth.token() ?? '',
        transport: signalR.HttpTransportType.WebSockets |
                   signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect([0, 2000, 5000, 15000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    // Global notification handler
    this.hub.on('ReceiveNotification', (payload: any) => {
      const isAr = this.lang.isArabic();
      const title = isAr ? payload.titleAr : payload.titleEn;
      const body  = isAr ? payload.bodyAr  : payload.bodyEn;
      this.notifs.pushReceived({ ...payload, title, body });
      this.toast.info(title, body);
    });

    // Chat message handler — delegate to registered handlers
    this.hub.on('ReceiveMessage', (msg: any) => {
      this.emit('ReceiveMessage', msg);
    });

    this.hub.on('UserTyping', () => this.emit('UserTyping', null));
    this.hub.on('MessageBlocked', (r: string) => this.emit('MessageBlocked', r));
    this.hub.on('Error', (e: string) => this.emit('Error', e));

    this.hub.onreconnected(() => {
      this.toast.info('Reconnected', 'Chat connection restored.');
    });

    await this.hub.start();
    this.notifs.loadUnreadCount();
  }

  async joinTask(taskId: string) {
    await this.hub?.invoke('JoinTask', taskId);
  }

  async leaveTask(taskId: string) {
    await this.hub?.invoke('LeaveTask', taskId);
  }

  async sendMessage(taskId: string, content: string) {
    await this.hub?.invoke('SendMessage', taskId, content);
  }

  async sendTyping(taskId: string) {
    await this.hub?.invoke('Typing', taskId);
  }

  on(event: string, handler: (data: any) => void) {
    if (!this.messageHandlers.has(event))
      this.messageHandlers.set(event, []);
    this.messageHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: (data: any) => void) {
    const handlers = this.messageHandlers.get(event) ?? [];
    this.messageHandlers.set(event, handlers.filter(h => h !== handler));
  }

  private emit(event: string, data: any) {
    (this.messageHandlers.get(event) ?? []).forEach(h => h(data));
  }

  disconnect() { this.hub?.stop(); }
}