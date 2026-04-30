import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { TaskService } from '../../core/services/task.service';
import { AuthService } from '../../core/services/auth.service';
import { WaseetTask } from '../../core/models/task.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div class="max-w-7xl mx-auto px-4 py-10">
      <div class="flex items-center justify-between mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">{{ 'nav.dashboard' | translate }}</h1>
        @if (auth.isClient()) {
          <a routerLink="/post-task" class="btn-primary">{{ 'nav.post' | translate }}</a>
        }
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        @for (stat of stats(); track stat.label) {
          <div class="card p-5">
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">{{ stat.label }}</p>
            <p class="text-2xl font-bold text-primary-500">{{ stat.value }}</p>
          </div>
        }
      </div>

      <!-- Tasks list -->
      <div class="card">
        <div class="p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 class="font-semibold text-gray-900 dark:text-white">{{ 'task.myTasks' | translate }}</h2>
        </div>
        @if (tasks().length === 0) {
          <div class="p-12 text-center text-gray-400">{{ 'task.noTasks' | translate }}</div>
        } @else {
          <div class="divide-y divide-gray-100 dark:divide-gray-700">
            @for (task of tasks(); track task.taskId) {
              <a [routerLink]="['/tasks', task.publicTaskCode]"
                 class="flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">{{ task.title }}</p>
                  <p class="text-xs text-gray-400 mt-0.5 font-mono">{{ task.publicTaskCode }}</p>
                </div>
                <div class="flex items-center gap-4">
                  <span class="font-bold text-primary-500">\${{ task.budgetUSD }}</span>
                  <span class="text-xs text-gray-400">{{ task.createdAt | date:'mediumDate' }}</span>
                </div>
              </a>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  auth = inject(AuthService);
  private taskService = inject(TaskService);
  tasks = signal<WaseetTask[]>([]);
  stats = signal<{label: string, value: number , color: string}[]>([]);

  ngOnInit() {
    this.taskService.myTasks().subscribe(t => {
      this.tasks.set(t);
      const pendingApproval = t.filter((x: any) => x.approvalStatus === 'PendingApproval').length;
      const rejected        = t.filter((x: any) => x.approvalStatus === 'Rejected').length;
      this.stats.set([
        { label: 'Total Tasks',      value: t.length,                                    color: 'var(--color-brand-600)' },
        { label: 'Pending Approval', value: pendingApproval,                             color: '#f59e0b' },
        { label: 'Active',           value: t.filter((x: any) => x.status === 2).length, color: '#6366f1' },
        { label: 'Completed',        value: t.filter((x: any) => x.status === 3).length, color: '#22c55e' },
      ]);
    });
  }
}
