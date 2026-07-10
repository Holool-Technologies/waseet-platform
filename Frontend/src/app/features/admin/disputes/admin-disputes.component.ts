import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { DeliveryService } from '../../../core/services/delivery.service';
import { Dispute } from '../../../core/models/delivery.models';

@Component({
  selector: 'app-admin-disputes',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div class="space-y-5">
      <div>
        <h1 class="section-title">{{ 'admin.disputes.title' | translate }}</h1>
        <p class="section-sub">{{ 'admin.disputes.subtitle' | translate }}</p>
      </div>

      @if (loading()) {
        <div class="space-y-4">
          @for (i of [1,2,3]; track i) {
            <div class="card p-5 animate-pulse flex items-center gap-4">
              <div class="flex-1 space-y-2">
                <div class="h-3 skeleton rounded w-1/4"></div>
                <div class="h-4 skeleton rounded w-3/4"></div>
                <div class="h-3 skeleton rounded w-1/2"></div>
              </div>
              <div class="w-28 h-8 skeleton rounded-xl flex-shrink-0"></div>
            </div>
          }
        </div>

      } @else if (disputes().length === 0) {
        <div class="card p-12 text-center">
          <p class="text-4xl mb-3">✓</p>
          <p class="font-semibold text-neutral-700 dark:text-neutral-300">
            {{ 'admin.disputes.noDisputes' | translate }}
          </p>
          <p class="text-sm text-neutral-400 mt-1">
            No open disputes at the moment.
          </p>
        </div>

      } @else {
        <div class="space-y-3">
          @for (d of disputes(); track d.disputeId) {
            <div class="card p-5 flex items-start gap-4 flex-wrap">

              <!-- Status badge + date -->
              <div class="flex-shrink-0">
                <span [class]="d.status === 'UnderAdminReview'
                  ? 'badge-blue' : 'badge-amber'">
                  {{ d.status === 'UnderAdminReview' ? 'Under Review' : 'Open' }}
                </span>
                <p class="text-xs text-neutral-400 mt-1">
                  {{ d.createdAt | date:'d MMM yyyy' }}
                </p>
              </div>

              <!-- Report preview -->
              <div class="flex-1 min-w-0">
                <p class="text-sm text-neutral-700 dark:text-neutral-300
                           line-clamp-2 leading-relaxed">
                  {{ d.report }}
                </p>
              </div>

              <!-- ✅ "View Full Case" button — replaces all inline resolve logic -->
              <a [routerLink]="['/admin/disputes', d.disputeId]"
                 class="btn-secondary btn-sm flex-shrink-0">
                View Full Case →
              </a>

            </div>
          }
        </div>
      }
    </div>
  `
})
export class AdminDisputesComponent implements OnInit {
  private svc = inject(DeliveryService);

  disputes = signal<Dispute[]>([]);
  loading  = signal(true);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getOpenDisputes().subscribe({
      next: d => { this.disputes.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
}