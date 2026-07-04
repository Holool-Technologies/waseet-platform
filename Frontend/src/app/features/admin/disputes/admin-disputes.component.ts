import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DeliveryService } from '../../../core/services/delivery.service';
import { ToastService } from '../../../core/services/toast.service';
import { Dispute } from '../../../core/models/delivery.models';

@Component({
  selector: 'app-admin-disputes',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="space-y-5">
      <div>
        <h1 class="section-title">{{ 'admin.disputes.title' | translate }}</h1>
        <p class="section-sub">{{ 'admin.disputes.subtitle' | translate }}</p>
      </div>

      @if (loading()) {
        <div class="space-y-4">
          @for (i of [1,2]; track i) {
            <div class="card p-6 animate-pulse space-y-3">
              <div class="h-4 skeleton rounded w-1/3"></div>
              <div class="h-16 skeleton rounded"></div>
            </div>
          }
        </div>
      } @else if (disputes().length === 0) {
        <div class="card p-12 text-center">
          <p class="text-4xl mb-3">✓</p>
          <p class="font-semibold text-neutral-700 dark:text-neutral-300">
            {{ 'admin.disputes.noDisputes' | translate }}
          </p>
        </div>
      } @else {
        <div class="space-y-4">
          @for (d of disputes(); track d.disputeId) {
            <div class="card p-6 space-y-4">

              <!-- Header -->
              <div class="flex items-center justify-between flex-wrap gap-3">
                <div class="flex items-center gap-2">
                  <span [class]="d.status === 'UnderAdminReview' ? 'badge-blue' : 'badge-amber'">
                    {{ d.status === 'UnderAdminReview'
                       ? ('admin.disputes.claimed' | translate)
                       : 'Open' }}
                  </span>
                  <span class="text-xs text-neutral-400">
                    {{ d.createdAt | date:'d MMM yyyy, HH:mm' }}
                  </span>
                </div>
                @if (d.status === 'Open') {
                  <button (click)="claim(d)"
                    [disabled]="claiming[d.disputeId]"
                    class="btn-secondary btn-sm">
                    {{ 'admin.disputes.claimBtn' | translate }}
                  </button>
                }
              </div>

              <!-- Client report -->
              <div class="bg-neutral-50 dark:bg-neutral-800/60 rounded-xl p-4">
                <p class="text-xs font-semibold text-neutral-500 uppercase
                           tracking-wider mb-2">
                  {{ 'admin.disputes.clientReport' | translate }}
                </p>
                <p class="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  {{ d.report }}
                </p>
              </div>

              <!-- Resolution form — only if claimed -->
              @if (d.status === 'UnderAdminReview') {
                <div class="space-y-3 border-t border-neutral-100
                            dark:border-neutral-800 pt-4">

                  <!-- Admin notes -->
                  <div>
                    <label class="input-label">
                      {{ 'admin.disputes.adminNotes' | translate }}
                    </label>
                    <textarea [(ngModel)]="notes[d.disputeId]" rows="3"
                      class="input resize-none text-sm"
                      [placeholder]="'admin.disputes.adminNotesPlaceholder' | translate">
                    </textarea>
                  </div>

                  <!-- Optional partial amounts -->
                  <details class="text-xs text-neutral-400 cursor-pointer">
                    <summary class="hover:text-neutral-600 dark:hover:text-neutral-300">
                      {{ 'admin.disputes.partialAmounts' | translate }}
                    </summary>
                    <div class="grid grid-cols-2 gap-3 mt-2">
                      <div>
                        <label class="input-label text-xs">
                          {{ 'admin.disputes.freelancerAmount' | translate }}
                        </label>
                        <input type="number" min="0" step="0.01"
                          [(ngModel)]="freelancerAmounts[d.disputeId]"
                          class="input text-sm" />
                      </div>
                      <div>
                        <label class="input-label text-xs">
                          {{ 'admin.disputes.clientAmount' | translate }}
                        </label>
                        <input type="number" min="0" step="0.01"
                          [(ngModel)]="clientAmounts[d.disputeId]"
                          class="input text-sm" />
                      </div>
                    </div>
                  </details>

                  <!-- Decision buttons -->
                  <div class="flex gap-2">
                    <button
                      (click)="resolve(d, 'FavorFreelancer')"
                      [disabled]="resolving[d.disputeId] || !notes[d.disputeId]?.trim()"
                      class="btn-primary btn-sm flex-1">
                      @if (resolving[d.disputeId] === 'FavorFreelancer') {
                        <span class="w-3 h-3 border-2 border-white border-t-transparent
                                     rounded-full animate-spin inline-block me-1"></span>
                      }
                      {{ 'admin.disputes.releaseFreelancer' | translate }}
                    </button>
                    <button
                      (click)="resolve(d, 'FavorClient')"
                      [disabled]="resolving[d.disputeId] || !notes[d.disputeId]?.trim()"
                      class="btn-secondary btn-sm flex-1">
                      @if (resolving[d.disputeId] === 'FavorClient') {
                        <span class="w-3 h-3 border-2 border-neutral-600 border-t-transparent
                                     rounded-full animate-spin inline-block me-1"></span>
                      }
                      {{ 'admin.disputes.refundClient' | translate }}
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `
})
export class AdminDisputesComponent implements OnInit {
  private svc       = inject(DeliveryService);
  private toast     = inject(ToastService);
  private translate = inject(TranslateService);

  disputes = signal<Dispute[]>([]);
  loading  = signal(true);
  claiming:         Record<string, boolean> = {};
  resolving:        Record<string, string>  = {};
  notes:            Record<string, string>  = {};
  freelancerAmounts: Record<string, number | undefined> = {};
  clientAmounts:     Record<string, number | undefined> = {};

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getOpenDisputes().subscribe({
      next: d => { this.disputes.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  claim(d: Dispute) {
    this.claiming[d.disputeId] = true;
    this.svc.claimDispute(d.disputeId).subscribe({
      next: updated => {
        this.disputes.update(ds =>
          ds.map(x => x.disputeId === d.disputeId ? updated : x));
        this.claiming[d.disputeId] = false;
      },
      error: () => { this.claiming[d.disputeId] = false; }
    });
  }

  resolve(d: Dispute, resolution: string) {
    const notes = this.notes[d.disputeId]?.trim();
    if (!notes) return;

    this.resolving[d.disputeId] = resolution;

    this.svc.resolveDispute(
      d.disputeId, resolution, notes,
      this.freelancerAmounts[d.disputeId],
      this.clientAmounts[d.disputeId]
    ).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('admin.disputes.resolved'));
        this.disputes.update(ds =>
          ds.filter(x => x.disputeId !== d.disputeId));
        delete this.resolving[d.disputeId];
      },
      error: err => {
        const code = err?.error?.code ?? 'UNKNOWN';
        const msg  = this.translate.instant(`deliveryErrors.${code}`);
        this.toast.error(msg);
        delete this.resolving[d.disputeId];
      }
    });
  }
}