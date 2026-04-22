import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { AdminUser, AdminPaged } from '../../../core/models/admin.models';
import { AdminTableComponent } from '../shared/admin-table.component';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminTableComponent],
  template: `
    <div class="space-y-5">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
      <div class="flex flex-wrap gap-3">
        <input [(ngModel)]="search" (keyup.enter)="load()"
          placeholder="Search email..." class="input-field text-sm py-2 w-64" />
        <select [(ngModel)]="roleFilter" (ngModelChange)="load()"
          class="input-field text-sm py-2 w-40">
          <option value="">All roles</option>
          <option value="Client">Client</option>
          <option value="Freelancer">Freelancer</option>
        </select>
        <button (click)="load()" class="btn-primary text-sm px-4 py-2">Search</button>
      </div>
      <app-admin-table
        [columns]="columns" [rows]="result()?.items ?? []"
        [actions]="actions" [loading]="loading()" idKey="userId"
        [page]="page" [pageSize]="20"
        [totalCount]="result()?.totalCount ?? 0"
        [totalPages]="result()?.totalPages ?? 1"
        (pageChange)="page = $event; load()"
        (actionClick)="onAction($event)">
      </app-admin-table>
    </div>
  `
})
export class AdminUsersComponent implements OnInit {
  private adminService = inject(AdminService);
  result = signal<AdminPaged<AdminUser> | null>(null);
  loading = signal(true);
  page = 1; search = ''; roleFilter = '';

  columns = [
    { key: 'email',      label: 'Email' },
    { key: 'role',       label: 'Role',       type: 'badge' as const,
      badgeMap: { Client: 'bg-blue-100 text-blue-700', Freelancer: 'bg-purple-100 text-purple-700' } as Record<string, string>},
    { key: 'kycStatus',  label: 'KYC',        type: 'badge' as const,
      badgeMap: { Approved: 'bg-green-100 text-green-700', Pending: 'bg-amber-100 text-amber-700', Rejected: 'bg-red-100 text-red-700' } as Record<string, string>},
    { key: 'taskCount',  label: 'Tasks',      type: 'number' as const },
    { key: 'createdAt',  label: 'Joined',     type: 'date' as const },
  ];
  actions = [
    { key: 'ban',    label: 'Ban',    danger: true },
    { key: 'delete', label: 'Delete', danger: true },
  ];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.adminService.getUsers(this.page, 20, this.search || undefined, this.roleFilter || undefined).subscribe({
      next: r => { this.result.set(r); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  onAction({ action, row }: { action: string; row: AdminUser }) {
    if (action === 'ban')    this.adminService.banUser(row.userId, true).subscribe(() => this.load());
    if (action === 'delete') {
      if (confirm(`Delete user ${row.email}? This cannot be undone.`))
        this.adminService.deleteUser(row.userId).subscribe(() => this.load());
    }
  }
}