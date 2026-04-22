import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { AdminTask, AdminPaged } from '../../../core/models/admin.models';
import { AdminTableComponent } from '../shared/admin-table.component';

@Component({
  selector: 'app-admin-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminTableComponent],
  template: `
    <div class="space-y-5">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Tasks</h1>
      <div class="flex flex-wrap gap-3">
        <input [(ngModel)]="search" (keyup.enter)="load()"
          placeholder="Search title or code..." class="input-field text-sm py-2 w-64" />
        <select [(ngModel)]="statusFilter" (ngModelChange)="load()"
          class="input-field text-sm py-2 w-40">
          <option value="">All statuses</option>
          <option value="Open">Open</option>
          <option value="Bidding">Bidding</option>
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
          <option value="Disputed">Disputed</option>
        </select>
        <button (click)="load()" class="btn-primary text-sm px-4 py-2">Search</button>
      </div>
      <app-admin-table
        [columns]="columns" [rows]="result()?.items ?? []"
        [actions]="actions" [loading]="loading()" idKey="taskId"
        [page]="page" [pageSize]="20"
        [totalCount]="result()?.totalCount ?? 0"
        [totalPages]="result()?.totalPages ?? 1"
        (pageChange)="page = $event; load()"
        (actionClick)="onAction($event)">
      </app-admin-table>
    </div>
  `
})
export class AdminTasksComponent implements OnInit {
  private adminService = inject(AdminService);
  result = signal<AdminPaged<AdminTask> | null>(null);
  loading = signal(true);
  page = 1; search = ''; statusFilter = '';

  columns = [
    { key: 'publicTaskCode', label: 'Code' },
    { key: 'title',          label: 'Title' },
    { key: 'categoryLabel',  label: 'Category' },
    { key: 'budgetUSD',      label: 'Budget',   type: 'money' as const },
    { key: 'status',         label: 'Status',   type: 'badge' as const,
      badgeMap: {
        Open:      'bg-green-100 text-green-700',
        Bidding:   'bg-blue-100 text-blue-700',
        Active:    'bg-yellow-100 text-yellow-700',
        Completed: 'bg-gray-100 text-gray-600',
        Disputed:  'bg-red-100 text-red-600',
      }},
    { key: 'proposalCount',  label: 'Bids',     type: 'number' as const },
    { key: 'createdAt',      label: 'Created',  type: 'date' as const },
  ];
  actions = [{ key: 'delete', label: 'Delete', danger: true }];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.adminService.getTasks(this.page, 20, this.search || undefined, this.statusFilter || undefined).subscribe({
      next: r => { this.result.set(r); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  onAction({ action, row }: { action: string; row: AdminTask }) {
    if (action === 'delete') {
      if (confirm(`Delete task ${row.publicTaskCode}?`))
        this.adminService.deleteTask(row.taskId).subscribe(() => this.load());
    }
  }
}