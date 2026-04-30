import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { TaskService } from '../../../core/services/task.service';
import { WaseetTask } from '../../../core/models/task.models';

@Component({
  selector: 'app-my-tasks',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div class="page">
      <div class="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 class="section-title">My Tasks</h1>
          <p class="section-sub">Track all your posted tasks and their approval status</p>
        </div>
        <a routerLink="/post-task" class="btn-primary">+ Post New Task</a>
      </div>

      @if (loading()) {
        <div class="space-y-3">
          @for (i of [1,2,3]; track i) {
            <div class="card p-5 animate-pulse flex gap-4">
              <div class="flex-1 space-y-2">
                <div class="h-4 skeleton rounded w-1/2"></div>
                <div class="h-3 skeleton rounded w-1/3"></div>
              </div>
            </div>
          }
        </div>
      } @else if (tasks().length === 0) {
        <div class="card p-12 text-center">
          <p class="text-4xl mb-4">📋</p>
          <p class="font-semibold text-neutral-700 dark:text-neutral-300">No tasks yet</p>
          <p class="text-sm text-neutral-400 mt-2">Post your first task to get started</p>
          <a routerLink="/post-task" class="btn-primary mt-6 inline-flex">Post a Task</a>
        </div>
      } @else {
        <div class="space-y-4">
          @for (task of tasks(); track task.taskId) {
            <div class="card p-5 hover:shadow-soft transition-all">
              <div class="flex items-start justify-between gap-4 flex-wrap">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap mb-1">
                    <span class="text-xs font-mono text-neutral-400">{{ task.publicTaskCode }}</span>
                    <span [class]="getApprovalBadge(task.approvalStatus)">
                      {{ getApprovalLabel(task.approvalStatus) }}
                    </span>
                    <span [class]="getStatusBadge(task.status)">
                      {{ task.statusLabel }}
                    </span>
                  </div>
                  <h3 class="font-semibold text-neutral-900 dark:text-white truncate">
                    {{ task.title }}
                  </h3>
                  <p class="text-sm text-neutral-500 mt-0.5">
                    Budget: <span class="font-semibold text-brand-600">\${{ task.budgetUSD }}</span>
                    · {{ task.proposalCount }} bid{{ task.proposalCount !== 1 ? 's' : '' }}
                    · {{ task.createdAt | date:'d MMM yyyy' }}
                  </p>

                  <!-- Rejection reason alert -->
                  @if (task.approvalStatus === 'Rejected' && task.rejectionReason) {
                    <div class="mt-3 flex items-start gap-2 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-xl px-3 py-2.5">
                      <span class="text-danger-500 flex-shrink-0 text-sm">⚠</span>
                      <div>
                        <p class="text-xs font-semibold text-danger-700 dark:text-danger-400">Rejection reason:</p>
                        <p class="text-xs text-danger-600 dark:text-danger-400 mt-0.5">{{ task.rejectionReason }}</p>
                      </div>
                    </div>
                  }

                  <!-- Pending approval info -->
                  @if (task.approvalStatus === 'PendingApproval') {
                    <div class="mt-3 flex items-center gap-2 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-xl px-3 py-2">
                      <div class="w-3 h-3 border-2 border-warning-500 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                      <p class="text-xs text-warning-700 dark:text-warning-400">
                        Your task is under review. You'll be notified once it's approved.
                      </p>
                    </div>
                  }
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-2 flex-shrink-0">
                  @if (task.approvalStatus === 'Approved') {
                    <a [routerLink]="['/tasks', task.publicTaskCode]" class="btn-secondary btn-sm">
                      View Task
                    </a>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class MyTasksComponent implements OnInit {
  private taskService = inject(TaskService);
  tasks   = signal<WaseetTask[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.taskService.myTasks().subscribe({
      next: t => { this.tasks.set(t); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  getApprovalBadge(status: string): string {
    return {
      PendingApproval: 'badge-amber',
      Approved:        'badge-green',
      Rejected:        'badge-red'
    }[status] ?? 'badge-gray';
  }

  getApprovalLabel(status: string): string {
    return {
      PendingApproval: '⏳ Pending Review',
      Approved:        '✓ Approved',
      Rejected:        '✕ Rejected'
    }[status] ?? status;
  }

  getStatusBadge(status: number): string {
    return ['badge-green','badge-blue','badge-amber','badge-gray','badge-red'][status] ?? 'badge-gray';
  }
}