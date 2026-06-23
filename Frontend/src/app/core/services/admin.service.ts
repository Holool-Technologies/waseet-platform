import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  DashboardStats, AdminUser, AdminTask,
  AdminKyc, AdminEscrow, AdminChatMessage, AdminPaged
} from '../models/admin.models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private base = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  getStats() {
    return this.http.get<DashboardStats>(`${this.base}/stats`);
  }

  getUsers(page = 1, pageSize = 20, search?: string, role?: string) {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (search) params = params.set('search', search);
    if (role)   params = params.set('role', role);
    return this.http.get<AdminPaged<AdminUser>>(`${this.base}/users`, { params });
  }

  banUser(userId: string, ban: boolean) {
    return this.http.patch(`${this.base}/users/${userId}/ban`, { ban });
  }

  deleteUser(userId: string) {
    return this.http.delete(`${this.base}/users/${userId}`);
  }


  getTasks(page = 1, pageSize = 20, search?: string, status?: string) {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (search) params = params.set('search', search);
    if (status) params = params.set('status', status);
    return this.http.get<AdminPaged<AdminTask>>(`${this.base}/tasks`, { params });
  }

  deleteTask(taskId: string) {
    return this.http.delete(`${this.base}/tasks/${taskId}`);
  }

  getEscrows(page = 1, pageSize = 20, status?: string) {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (status) params = params.set('status', status);
    return this.http.get<AdminPaged<AdminEscrow>>(`${this.base}/escrow`, { params });
  }

  resolveDispute(escrowId: string, resolution: 'release' | 'refund') {
    return this.http.patch(`${this.base}/escrow/${escrowId}/resolve`, { resolution });
  }

  getChatLogs(page = 1, pageSize = 30, blockedOnly = false) {
    const params = new HttpParams()
      .set('page', page).set('pageSize', pageSize).set('blockedOnly', blockedOnly);
    return this.http.get<AdminPaged<AdminChatMessage>>(`${this.base}/chat-logs`, { params });
  }
}