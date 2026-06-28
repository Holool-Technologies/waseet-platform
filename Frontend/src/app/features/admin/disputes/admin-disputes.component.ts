import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';

interface Dispute {
  disputeId: string; deliveryId: string; taskId: string;
  report: string; status: string;
  resolution: string | null; adminNotes: string;
  createdAt: string; resolvedAt: string | null;
}

@Component({
  selector: 'app-admin-disputes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule],
  template: `
    <div class="space-y-5">
      <div>
        <h1 class="section-title">{{ 'admin.disputes.title' | translate }}</h1>
        <p class="section-sub">{{ 'admin.disputes.subtitle' | translate }}</p>
      </div>

      @if (loading()) {
        <div class="space-y-4">
          @for (i of [1,2]; track i) {
            <div class="card p-6 animate-pulse">
              <div class="h-4 skeleton rounded w-1/3 mb-3"></div>
              <div class="h-16 skeleton rounded"></div>
            </div>
          }
        </div>
      } @else if (disputes().length === 0) {
        <div class="card p-12 text-center">
          <p class="text-4xl mb-3">✓</p>
          <p class="font-semibold text-neutral-700 dark:text-neutral-300">
            {{ 'admin.disputes.noOpenDisputes' | translate }}
          </p>
        </div>
      } @else {
        <div class="space-y-4">
          @for (d of disputes(); track d.disputeId) {
            <div class="card p-6">
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs text-neutral-400">
                  {{ d.createdAt | date:'d MMM yyyy, HH:mm' }}
                </span>
                <a [routerLink]="['/admin/tasks']" [queryParams]="{ taskId: d.taskId }"
                  class="text-xs text-brand-600 hover:underline">
                  View task →
                </a>
              </div>

              <div class="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4 mb-4">
                <p class="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
                  {{ 'admin.disputes.report' | translate }}
                </p>
                <p class="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  {{ d.report }}
                </p>
              </div>

              <div class="mb-4">
                <label class="input-label">{{ 'admin.disputes.notes' | translate }}</label>
                <textarea [(ngModel)]="notes[d.disputeId]" rows="2"
                  class="input resize-none text-sm"></textarea>
              </div>

              <div class="flex gap-2">
                <button (click)="resolve(d, 'FavorFreelancer')"
                  [disabled]="resolving[d.disputeId]"
                  class="btn-primary btn-sm flex-1">
                  {{ 'admin.disputes.resolveFreelancer' | translate }}
                </button>
                <button (click)="resolve(d, 'FavorClient')"
                  [disabled]="resolving[d.disputeId]"
                  class="btn-secondary btn-sm flex-1">
                  {{ 'admin.disputes.resolveClient' | translate }}
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class AdminDisputesComponent implements OnInit {
  private http      = inject(HttpClient);
  private toast     = inject(ToastService);
  private translate = inject(TranslateService);

  disputes = signal<Dispute[]>([]);
  loading  = signal(true);
  notes: Record<string, string>    = {};
  resolving: Record<string, boolean> = {};

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.http.get<Dispute[]>(`${environment.apiUrl}/admin/disputes`).subscribe({
      next: d => { this.disputes.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  resolve(dispute: Dispute, resolution: string) {
    this.resolving[dispute.disputeId] = true;
    this.http.post(
      `${environment.apiUrl}/admin/disputes/${dispute.disputeId}/resolve`,
      { resolution, adminNotes: this.notes[dispute.disputeId] ?? '' }
    ).subscribe({
      next: () => {
        this.toast.success('Dispute resolved');
        this.disputes.update(ds => ds.filter(x => x.disputeId !== dispute.disputeId));
        this.resolving[dispute.disputeId] = false;
      },
      error: () => {
        this.toast.error('Resolution failed');
        this.resolving[dispute.disputeId] = false;
      }
    });
  }
}