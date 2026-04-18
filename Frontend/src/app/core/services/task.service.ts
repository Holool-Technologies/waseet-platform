import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CreateTaskRequest, CreateProposalRequest, WaseetTask, Proposal } from '../models/task.models';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private base = `${environment.apiUrl}/tasks`;

  constructor(private http: HttpClient) {}

  browse(
    page = 1,
    pageSize = 12,
    search?: string,
    minBudget?: number,
    maxBudget?: number,
    status?: number,
    category?: number,
    sortBy = 'newest'
  ) {
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize)
      .set('sortBy', sortBy);

    if (search)     params = params.set('search', search);
    if (minBudget)  params = params.set('minBudget', minBudget);
    if (maxBudget)  params = params.set('maxBudget', maxBudget);
    if (status !== undefined) params = params.set('status', status);
    if (category !== undefined) params = params.set('category', category);

    return this.http.get<any>(`${this.base}`, { params });
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

  // REQ 7: proposals now returned for both client (full) and freelancer (anonymized)
  getProposals(taskCode: string) {
    return this.http.get<Proposal[]>(`${this.base}/${taskCode}/proposals`);
  }

  submitProposal(taskCode: string, req: CreateProposalRequest) {
    return this.http.post<Proposal>(`${this.base}/${taskCode}/proposals`, req);
  }

  awardProposal(taskCode: string, proposalId: string) {
    return this.http.patch(`${this.base}/${taskCode}/award/${proposalId}`, {});
  }
}