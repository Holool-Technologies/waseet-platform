import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { AdminKyc, AdminPaged } from '../../../core/models/admin.models';
import { AdminTableComponent } from '../shared/admin-table.component';

@Component({
  selector: 'app-admin-kyc',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminTableComponent],
  template: `
    <div class="space-y-5">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">KYC Queue</h1>
        <div class="flex gap-2">
          @for (s of ['Pending','Approved','Rejected']; track s) {
            <button (click)="filterStatus = s; load()"
              [class]="filterStatus === s
                ? 'btn-primary text-xs px-3 py-1.5'
                : 'btn-outline text-xs px-3 py-1.5'">
              {{ s }}
            </button>
          }
        </div>
      </div>

      <app-admin-table
        [columns]="columns"
        [rows]="result()?.items ?? []"
        [actions]="actions"
        [loading]="loading()"
        idKey="kycId"
        [page]="page"
        [pageSize]="20"
        [totalCount]="result()?.totalCount ?? 0"
        [totalPages]="result()?.totalPages ?? 1"
        (pageChange)="page = $event; load()"
        (actionClick)="onAction($event)">
      </app-admin-table>
    </div>
  `
})
export class AdminKycComponent implements OnInit {
  private adminService = inject(AdminService);
  result = signal<AdminPaged<AdminKyc> | null>(null);
  loading = signal(true);
  page = 1;
  filterStatus = 'Pending';

  columns = [
    { key: 'userEmail',    label: 'Email' },
    { key: 'status',       label: 'Status',   type: 'badge' as const,
      badgeMap: {
        Pending:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        Approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        Rejected: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
      }},
    { key: 'documentBlobRef', label: 'Document' },
    { key: 'submittedAt',  label: 'Submitted', type: 'date' as const },
    { key: 'verifiedAt',   label: 'Decided',   type: 'date' as const },
  ];

  actions = [
    { key: 'approve', label: 'Approve' },
    { key: 'reject',  label: 'Reject',  danger: true },
  ];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.adminService.getKycQueue(this.page, 20, this.filterStatus).subscribe({
      next: r => { this.result.set(r); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  onAction({ action, row }: { action: string; row: AdminKyc }) {
    this.adminService.decideKyc(row.kycId, action as 'approve' | 'reject').subscribe({
      next: () => this.load()
    });
  }
}