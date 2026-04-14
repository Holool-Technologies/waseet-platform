import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { TaskService } from '../../../core/services/task.service';
import { WaseetTask } from '../../../core/models/task.models';

@Component({
  selector: 'app-browse',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div class="max-w-7xl mx-auto px-4 py-10">
      <div class="flex items-center justify-between mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">{{ 'task.browse' | translate }}</h1>
        <span class="text-sm text-gray-400">{{ tasks().length }} tasks</span>
      </div>

      @if (loading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="card p-6 animate-pulse">
              <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
              <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
              <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            </div>
          }
        </div>
      } @else if (tasks().length === 0) {
        <div class="text-center py-20 text-gray-400">{{ 'task.noTasks' | translate }}</div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (task of tasks(); track task.taskId) {
            <a [routerLink]="['/tasks', task.publicTaskCode]"
               class="card p-6 hover:shadow-md hover:border-primary-200 dark:hover:border-primary-800 transition-all duration-200 block">
              <div class="flex items-start justify-between mb-3">
                <span class="text-xs font-mono text-gray-400">{{ task.publicTaskCode }}</span>
                <span [class]="statusClass(task.status)" class="badge-status">
                  {{ statusLabel(task.status) }}
                </span>
              </div>
              <h3 class="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">{{ task.title }}</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">{{ task.description }}</p>
              <div class="flex items-center justify-between">
                <span class="text-lg font-bold text-primary-500">\${{ task.budgetUSD }}</span>
                <span class="text-xs text-gray-400">{{ task.createdAt | date:'mediumDate' }}</span>
              </div>
            </a>
          }
        </div>
      }
    </div>
  `
})
export class BrowseComponent implements OnInit {
  private taskService = inject(TaskService);
  tasks = signal<WaseetTask[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.taskService.browse().subscribe({
      next: t => { this.tasks.set(t); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  statusClass(status: number): string {
    const map: Record<number, string> = {
      0: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      1: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      2: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      3: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
      4: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    };
    return map[status] ?? map[0];
  }

  statusLabel(status: number): string {
    return ['Open','Bidding','Active','Completed','Disputed'][status] ?? 'Open';
  }
}