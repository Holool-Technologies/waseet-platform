import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { AdminEscrow, AdminPaged } from '../../../core/models/admin.models';
import { AdminTableComponent } from '../shared/admin-table.component';

@Component({
  selector: 'app-admin-escrow',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminTableComponent],
  template: `
    <div class="space-y-5">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Escrow Management</h1>
      <div class="flex gap-2 flex-wrap">
        @for (s of ['','Held','Released','Disputed','Refunded']; track s) {
          <button (click)="statusFilter = s; load()"
            [class]="statusFilter === s ? 'btn-primary text-xs px-3 py-1.5' : 'btn-outline text-xs px-3 py-1.5'">
            {{ s || 'All' }}
          </button>
        }
      </div>
      <app-admin-table
        [columns]="columns" [rows]="result()?.items ?? []"
        [actions]="actions" [loading]="loading()" idKey="escrowId"
        [page]="page" [pageSize]="20"
        [totalCount]="result()?.totalCount ?? 0"
        [totalPages]="result()?.totalPages ?? 1"
        (pageChange)="page = $event; load()"
        (actionClick)="onAction($event)">
      </app-admin-table>
    </div>
  `
})
export class AdminEscrowComponent implements OnInit {
  private adminService = inject(AdminService);
  result = signal<AdminPaged<AdminEscrow> | null>(null);
  loading = signal(true);
  page = 1; statusFilter = 'Disputed';

  columns = [
    { key: 'taskCode',   label: 'Task Code' },
    { key: 'amountUSD',  label: 'Amount',   type: 'money' as const },
    { key: 'status',     label: 'Status',   type: 'badge' as const,
      badgeMap: {
        Held:      'bg-amber-100 text-amber-700',
        Released:  'bg-green-100 text-green-700',
        Disputed:  'bg-red-100 text-red-600',
        Refunded:  'bg-gray-100 text-gray-600',
      }},
    { key: 'heldAt',     label: 'Held At',  type: 'date' as const },
    { key: 'releasedAt', label: 'Resolved', type: 'date' as const },
  ];
  actions = [
    { key: 'release', label: 'Release to freelancer' },
    { key: 'refund',  label: 'Refund to client', danger: true },
  ];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.adminService.getEscrows(this.page, 20, this.statusFilter || undefined).subscribe({
      next: r => { this.result.set(r); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  onAction({ action, row }: { action: string; row: AdminEscrow }) {
    if (action === 'release' || action === 'refund') {
      this.adminService.resolveDispute(row.escrowId, action).subscribe(() => this.load());
    }
  }
}