import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DeliveryService } from '../../../core/services/delivery.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-delivery-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="max-w-lg space-y-6">
      <div>
        <h1 class="section-title">{{ 'admin.deliverySettings.title' | translate }}</h1>
      </div>

      @if (loading()) {
        <div class="card p-6 animate-pulse space-y-4">
          <div class="h-4 skeleton rounded w-1/3"></div>
          <div class="h-10 skeleton rounded"></div>
          <div class="h-4 skeleton rounded w-1/3"></div>
          <div class="h-10 skeleton rounded"></div>
        </div>
      } @else {
        <div class="card p-6 space-y-5">
          <div>
            <label class="input-label">
              {{ 'admin.deliverySettings.reviewWindow' | translate }}
            </label>
            <input type="number" [(ngModel)]="reviewWindowDays"
              min="1" max="30" class="input" />
            <p class="input-hint">
              Days the client has to respond before payment auto-releases.
            </p>
          </div>

          <div>
            <label class="input-label">
              {{ 'admin.deliverySettings.maxRevisions' | translate }}
            </label>
            <input type="number" [(ngModel)]="maxRevisions"
              min="0" max="10" class="input" />
            <p class="input-hint">
              Set to 0 to disable revisions entirely.
            </p>
          </div>

          <button (click)="save()" [disabled]="saving()" class="btn-primary w-full">
            @if (saving()) {
              <span class="w-4 h-4 border-2 border-white border-t-transparent
                           rounded-full animate-spin inline-block me-2"></span>
            }
            {{ 'admin.deliverySettings.save' | translate }}
          </button>
        </div>
      }
    </div>
  `
})
export class AdminDeliverySettingsComponent implements OnInit {
  private svc       = inject(DeliveryService);
  private toast     = inject(ToastService);
  private translate = inject(TranslateService);

  loading = signal(true);
  saving  = signal(false);

  reviewWindowDays = 7;
  maxRevisions     = 3;

  ngOnInit() {
    this.svc.getSettings().subscribe({
      next: s => {
        this.reviewWindowDays = s.reviewWindowDays;
        this.maxRevisions     = s.maxRevisions;
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  save() {
    this.saving.set(true);
    this.svc.updateSettings({
      reviewWindowDays: this.reviewWindowDays,
      maxRevisions:     this.maxRevisions
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(
          this.translate.instant('admin.deliverySettings.saved'));
      },
      error: () => this.saving.set(false)
    });
  }
}