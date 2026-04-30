import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';

interface PendingTask {
  taskId: string; publicTaskCode: string; title: string;
  description: string; categoryLabel: string; budgetUSD: number;
  proposalCount: number; createdAt: string;
}

@Component({
  selector: 'app-admin-task-approval',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-5">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="section-title">Task Approval Queue</h1>
          <p class="section-sub">Review and approve or reject tasks before they go live</p>
        </div>
        <span class="badge-amber text-sm px-3 py-1">{{ total() }} pending</span>
      </div>

      @if (loading()) {
        <div class="space-y-4">
          @for (i of [1,2,3]; track i) {
            <div class="card p-5 animate-pulse">
              <div class="h-4 skeleton rounded w-1/3 mb-3"></div>
              <div class="h-3 skeleton rounded w-full mb-2"></div>
              <div class="h-3 skeleton rounded w-2/3"></div>
            </div>
          }
        </div>
      } @else if (tasks().length === 0) {
        <div class="card p-12 text-center">
          <p class="text-4xl mb-3">✓</p>
          <p class="font-semibold text-neutral-700 dark:text-neutral-300">Queue is empty!</p>
          <p class="text-sm text-neutral-400 mt-1">All tasks have been reviewed.</p>
        </div>
      } @else {
        <div class="space-y-4">
          @for (task of tasks(); track task.taskId) {
            <div class="card p-6">
              <div class="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-2 flex-wrap">
                    <span class="text-xs font-mono text-neutral-400">{{ task.publicTaskCode }}</span>
                    <span class="badge-blue">{{ task.categoryLabel }}</span>
                    <span class="font-bold text-brand-600">\${{ task.budgetUSD }}</span>
                  </div>
                  <h3 class="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                    {{ task.title }}
                  </h3>
                  <p class="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed line-clamp-3">
                    {{ task.description }}
                  </p>
                  <p class="text-xs text-neutral-400 mt-2">
                    Posted {{ task.createdAt | date:'d MMM yyyy, HH:mm' }}
                  </p>
                </div>
              </div>

              <!-- Rejection reason input -->
              @if (showRejectForm[task.taskId]) {
                <div class="mb-4 p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-xl">
                  <label class="input-label text-xs text-danger-700 dark:text-danger-400">
                    Rejection reason (required — will be sent to client)
                  </label>
                  <textarea
                    [(ngModel)]="rejectionReasons[task.taskId]"
                    rows="3"
                    class="input resize-none mt-1 text-sm"
                    placeholder="Explain why this task is being rejected...">
                  </textarea>
                </div>
              }

              <div class="flex items-center gap-3 flex-wrap">
                <button
                  (click)="approve(task)"
                  [disabled]="deciding[task.taskId]"
                  class="btn-primary btn-sm">
                  @if (deciding[task.taskId] === 'approve') {
                    <span class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  }
                  ✓ Approve & Publish
                </button>

                @if (!showRejectForm[task.taskId]) {
                  <button
                    (click)="showRejectForm[task.taskId] = true"
                    class="btn-danger btn-sm">
                    ✕ Reject
                  </button>
                } @else {
                  <button
                    (click)="reject(task)"
                    [disabled]="deciding[task.taskId] || !rejectionReasons[task.taskId]?.trim()"
                    class="btn-danger btn-sm">
                    @if (deciding[task.taskId] === 'reject') {
                      <span class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    }
                    Confirm Rejection
                  </button>
                  <button
                    (click)="showRejectForm[task.taskId] = false"
                    class="btn-ghost btn-sm">
                    Cancel
                  </button>
                }
              </div>
            </div>
          }
        </div>

        <!-- Pagination -->
        @if (totalPages() > 1) {
          <div class="flex justify-center gap-2">
            <button (click)="changePage(page - 1)" [disabled]="page === 1" class="btn-secondary btn-sm">← Prev</button>
            <span class="btn-ghost btn-sm">{{ page }} / {{ totalPages() }}</span>
            <button (click)="changePage(page + 1)" [disabled]="page === totalPages()" class="btn-secondary btn-sm">Next →</button>
          </div>
        }
      }
    </div>
  `
})
export class AdminTaskApprovalComponent implements OnInit {
  private http  = inject(HttpClient);
  private toast = inject(ToastService);

  tasks      = signal<PendingTask[]>([]);
  loading    = signal(true);
  total      = signal(0);
  totalPages = signal(1);
  page       = 1;

  showRejectForm:   Record<string, boolean> = {};
  rejectionReasons: Record<string, string>  = {};
  deciding:         Record<string, string>  = {};

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const params = new HttpParams().set('page', this.page).set('pageSize', 10);
    this.http.get<any>(`${environment.apiUrl}/admin/tasks/pending-approval`, { params })
      .subscribe({
        next: r => {
          this.tasks.set(r.items);
          this.total.set(r.totalCount);
          this.totalPages.set(r.totalPages);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
  }

  approve(task: PendingTask) {
    this.deciding[task.taskId] = 'approve';
    this.http.patch(`${environment.apiUrl}/admin/tasks/${task.taskId}/approve`, {})
      .subscribe({
        next: () => {
          this.toast.success('Task approved', `"${task.title}" is now live.`);
          this.tasks.update(t => t.filter(x => x.taskId !== task.taskId));
          this.total.update(c => c - 1);
          delete this.deciding[task.taskId];
        },
        error: () => {
          this.toast.error('Failed to approve task');
          delete this.deciding[task.taskId];
        }
      });
  }

  reject(task: PendingTask) {
    const reason = this.rejectionReasons[task.taskId]?.trim();
    if (!reason) return;
    this.deciding[task.taskId] = 'reject';
    this.http.patch(`${environment.apiUrl}/admin/tasks/${task.taskId}/reject`, { reason })
      .subscribe({
        next: () => {
          this.toast.success('Task rejected', 'Client has been notified.');
          this.tasks.update(t => t.filter(x => x.taskId !== task.taskId));
          this.total.update(c => c - 1);
          delete this.deciding[task.taskId];
        },
        error: () => {
          this.toast.error('Failed to reject task');
          delete this.deciding[task.taskId];
        }
      });
  }

  changePage(p: number) { this.page = p; this.load(); }
}