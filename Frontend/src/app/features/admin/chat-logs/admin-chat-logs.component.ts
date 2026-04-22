import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { AdminChatMessage, AdminPaged } from '../../../core/models/admin.models';
import { AdminTableComponent } from '../shared/admin-table.component';

@Component({
  selector: 'app-admin-chat-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminTableComponent],
  template: `
    <div class="space-y-5">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Chat Audit Logs</h1>
        <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
          <input type="checkbox" [(ngModel)]="blockedOnly" (ngModelChange)="load()"
            class="w-4 h-4 rounded accent-primary-500" />
          Show blocked only
        </label>
      </div>
      <app-admin-table
        [columns]="columns" [rows]="result()?.items ?? []"
        [actions]="[]" [loading]="loading()" idKey="messageId"
        [page]="page" [pageSize]="30"
        [totalCount]="result()?.totalCount ?? 0"
        [totalPages]="result()?.totalPages ?? 1"
        (pageChange)="page = $event; load()">
      </app-admin-table>
    </div>
  `
})
export class AdminChatLogsComponent implements OnInit {
  private adminService = inject(AdminService);
  result = signal<AdminPaged<AdminChatMessage> | null>(null);
  loading = signal(true);
  page = 1; blockedOnly = false;

  columns = [
    { key: 'taskCode',         label: 'Task' },
    { key: 'senderRole',       label: 'Sender' },
    { key: 'sanitizedContent', label: 'Content' },
    { key: 'piiDetected',      label: 'PII',     type: 'badge' as const,
      badgeMap: { true: 'bg-amber-100 text-amber-700', false: 'bg-gray-100 text-gray-500' }},
    { key: 'blocked',          label: 'Blocked', type: 'badge' as const,
      badgeMap: { true: 'bg-red-100 text-red-600', false: 'bg-green-100 text-green-700' }},
    { key: 'sentAt',           label: 'Time',    type: 'date' as const },
  ];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.adminService.getChatLogs(this.page, 30, this.blockedOnly).subscribe({
      next: r => { this.result.set(r); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
}