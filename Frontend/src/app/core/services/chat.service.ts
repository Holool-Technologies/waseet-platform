
import { Injectable, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { ChatMessage } from '../models/task.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ChatService {
  messages = signal<ChatMessage[]>([]);
  isConnected = signal(false);
  private hub: signalR.HubConnection | null = null;

  constructor(private auth: AuthService, private http: HttpClient) {}

  async connect(taskId: string) {
    this.hub = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.hubUrl}/hubs/chat?access_token=${this.auth.token()}`)
      .withAutomaticReconnect()
      .build();

    this.hub.on('ReceiveMessage', (msg: ChatMessage) => {
      this.messages.update(msgs => [...msgs, msg]);
    });

    await this.hub.start();
    await this.hub.invoke('JoinTask', taskId);
    this.isConnected.set(true);

    const history = await this.http.get<ChatMessage[]>(
      `${environment.apiUrl}/chat/${taskId}/messages`
    ).toPromise();
    this.messages.set(history || []);
  }

  async send(taskId: string, content: string) {
    if (!this.hub) return;
    await this.hub.invoke('SendMessage', taskId, content);
  }

  async disconnect(taskId: string) {
    if (!this.hub) return;
    await this.hub.invoke('LeaveTask', taskId);
    await this.hub.stop();
    this.isConnected.set(false);
    this.messages.set([]);
  }
}