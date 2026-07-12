import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Delivery, DeliveryLink, RevisionRequest, Dispute,
  AuditLog, DeliverySettings
} from '../models/delivery.models';

@Injectable({ providedIn: 'root' })
export class DeliveryService {
  private http = inject(HttpClient);
  private base = (code: string) =>
    `${environment.apiUrl}/tasks/${code}/delivery`;

  // Freelancer: submit delivery with files
  submit(
  code:            string,
  note:            string,
  files:           File[],
  videoUrl?:       string,
  links?:          DeliveryLink[],
): Observable<Delivery> {
  const fd = new FormData();
  fd.append('note',            note);
  fd.append('videoUrl',        videoUrl        ?? '');
  fd.append('links',           JSON.stringify(links    ?? []));
  files.forEach(f => fd.append('files', f));
  return this.http.post<Delivery>(this.base(code), fd);
}

  // Get active delivery for a task
  get(code: string): Observable<Delivery> {
    return this.http.get<Delivery>(this.base(code));
  }

  // Client: accept delivery
  accept(code: string, deliveryId: string): Observable<Delivery> {
    return this.http.post<Delivery>(
      `${this.base(code)}/${deliveryId}/accept`, {});
  }

  // Client: request revision
  requestRevision(code: string, deliveryId: string, reason: string): Observable<RevisionRequest> {
    return this.http.post<RevisionRequest>(
      `${this.base(code)}/${deliveryId}/revise`, { reason });
  }

  // Client: open dispute
  openDispute(code: string, deliveryId: string, report: string): Observable<Dispute> {
    return this.http.post<Dispute>(
      `${this.base(code)}/${deliveryId}/dispute`, { report });
  }

  // Get audit log for a delivery
  getAuditLog(code: string, deliveryId: string): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(
      `${this.base(code)}/${deliveryId}/audit`);
  }

  // Admin: get open disputes
  getOpenDisputes(): Observable<Dispute[]> {
    return this.http.get<Dispute[]>(
      `${environment.apiUrl}/admin/disputes`);
  }

  // Admin: claim dispute
  claimDispute(disputeId: string): Observable<Dispute> {
    return this.http.post<Dispute>(
      `${environment.apiUrl}/admin/disputes/${disputeId}/claim`, {});
  }

  // Admin: resolve dispute
  resolveDispute(
    disputeId: string,
    resolution: string,
    adminNotes: string,
    freelancerAmount?: number,
    clientRefundAmount?: number
  ): Observable<Dispute> {
    return this.http.post<Dispute>(
      `${environment.apiUrl}/admin/disputes/${disputeId}/resolve`,
      { resolution, adminNotes, freelancerAmount, clientRefundAmount });
  }

  // Admin: get/update settings
  getSettings(): Observable<DeliverySettings> {
    return this.http.get<DeliverySettings>(
      `${environment.apiUrl}/admin/delivery-settings`);
  }

  updateSettings(settings: DeliverySettings): Observable<void> {
    return this.http.patch<void>(
      `${environment.apiUrl}/admin/delivery-settings`, settings);
  }

  // Resolve file URL
  resolveFileUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${environment.apiUrl.replace(/\/api$/, '')}${url}`;
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}