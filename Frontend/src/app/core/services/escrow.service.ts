import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { EscrowTransaction } from '../models/task.models';

@Injectable({ providedIn: 'root' })
export class EscrowService {
  constructor(private http: HttpClient) {}

  getByTask(taskCode: string) {
    return this.http.get<EscrowTransaction>(`${environment.apiUrl}/escrow/task/${taskCode}`);
  }

  release(escrowId: string) {
    return this.http.patch(`${environment.apiUrl}/escrow/${escrowId}/release`, {});
  }

  dispute(escrowId: string) {
    return this.http.patch(`${environment.apiUrl}/escrow/${escrowId}/dispute`, {});
  }
}