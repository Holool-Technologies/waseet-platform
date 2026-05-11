import { Injectable, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { HttpClient, HttpParams } from '@angular/common/http';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export interface ChatMessageResponse {
  messageId: string;
  taskId: string;
  senderRole: 'Client' | 'Freelancer';
  sanitizedContent: string;
  piiDetected: boolean;
  blocked: boolean;
  sentAt: string;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  messages = signal<ChatMessageResponse[]>([]);
  isConnected = signal(false);
  isTyping = signal(false);
  connectionError = signal('');

  private hub: signalR.HubConnection | null = null;
  private typingTimer: any;

  constructor(private auth: AuthService, private http: HttpClient) {}

  async connect(taskId: string): Promise<void> {
    if (this.hub?.state === signalR.HubConnectionState.Connected) return;

    this.hub = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.hubUrl}/hubs/chat`, {
        accessTokenFactory: () => this.auth.token() ?? '',
        transport: signalR.HttpTransportType.WebSockets |
                   signalR.HttpTransportType.LongPolling  // fallback for Azure F1
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    // Incoming message
    this.hub.on('ReceiveMessage', (msg: ChatMessageResponse) => {
      this.messages.update(msgs => [...msgs, msg]);
      this.isTyping.set(false);
    });

    // Typing indicator
    this.hub.on('UserTyping', () => {
      this.isTyping.set(true);
      clearTimeout(this.typingTimer);
      this.typingTimer = setTimeout(() => this.isTyping.set(false), 2000);
    });

    // Blocked message feedback
    this.hub.on('MessageBlocked', (reason: string) => {
      this.messages.update(msgs => [...msgs, {
        messageId: crypto.randomUUID(),
        taskId,
        senderRole: 'Client',
        sanitizedContent: `⚠ Message blocked: ${reason}`,
        piiDetected: true,
        blocked: true,
        sentAt: new Date().toISOString()
      }]);
    });

    // Error handler
    this.hub.on('Error', (error: string) => {
      this.connectionError.set(error);
      setTimeout(() => this.connectionError.set(''), 4000);
    });

    // Reconnection events
    this.hub.onreconnecting(() => this.isConnected.set(false));
    this.hub.onreconnected(async () => {
      this.isConnected.set(true);
      await this.hub!.invoke('JoinTask', taskId);
    });
    this.hub.onclose(() => this.isConnected.set(false));

    try
    {
      await this.hub.start();
      await this.hub.invoke('JoinTask', taskId);
      this.isConnected.set(true);
      this.connectionError.set('');

      // Load history
      await this.loadHistory(taskId);
    }
    catch (err)
    {
      this.connectionError.set('Failed to connect to chat. Retrying...');
      console.error('SignalR connection failed:', err);
    }
  }

  async send(taskId: string, content: string): Promise<void> {
    if (!this.hub || this.hub.state !== signalR.HubConnectionState.Connected) {
      this.connectionError.set('Not connected. Please wait...');
      return;
    }
    await this.hub.invoke('SendMessage', taskId, content);
  }

  async sendTyping(taskId: string): Promise<void> {
    if (this.hub?.state === signalR.HubConnectionState.Connected)
      await this.hub.invoke('Typing', taskId);
  }

  async disconnect(taskId: string): Promise<void> {
    if (!this.hub) return;
    try {
      if (this.hub.state === signalR.HubConnectionState.Connected)
        await this.hub.invoke('LeaveTask', taskId);
      await this.hub.stop();
    } catch {}
    this.isConnected.set(false);
    this.messages.set([]);
  }

  private async loadHistory(taskId: string): Promise<void> {
    const params = new HttpParams().set('page', 1).set('pageSize', 50);
    this.http.get<ChatMessageResponse[]>(
      `${environment.apiUrl}/chat/${taskId}/messages`, { params }
    ).subscribe({
      next: msgs => this.messages.set(msgs),
      error: () => {}
    });
  }
  markConversationRead(conversationId: string): void {
  // Fire-and-forget — don't block UI on this
  this.http.post(
    `${environment.apiUrl}/chat/conversation/${conversationId}/read`,
    {}
  ).subscribe({
    error: (err) => console.warn('Failed to mark conversation read:', err)
  });
}
}