import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CreateTaskRequest, CreateProposalRequest, WaseetTask, Proposal } from '../models/task.models';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private base = `${environment.apiUrl}/tasks`;

  constructor(private http: HttpClient) {}

  browse(page = 1, pageSize = 10) {
    return this.http.get<WaseetTask[]>(`${this.base}?page=${page}&pageSize=${pageSize}`);
  }

  getByCode(code: string) {
    return this.http.get<WaseetTask>(`${this.base}/${code}`);
  }

  myTasks() {
    return this.http.get<WaseetTask[]>(`${this.base}/mine`);
  }

  create(req: CreateTaskRequest) {
    return this.http.post<WaseetTask>(this.base, req);
  }

  submitProposal(taskCode: string, req: CreateProposalRequest) {
    return this.http.post<Proposal>(`${this.base}/${taskCode}/proposals`, req);
  }

  getProposals(taskCode: string) {
    return this.http.get<Proposal[]>(`${this.base}/${taskCode}/proposals`);
  }

  awardProposal(taskCode: string, proposalId: string) {
    return this.http.patch(`${this.base}/${taskCode}/award/${proposalId}`, {});
  }
}