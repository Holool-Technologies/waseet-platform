import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';

interface DeliveryFile {
  fileId: string; fileName: string; fileUrl: string;
  sizeBytes: number; contentType: string; uploadedAt: string;
}

interface Delivery {
  deliveryId: string; taskId: string; freelancerUserId: string;
  note: string; status: string; submittedAt: string;
  reviewDeadline: string; respondedAt: string | null;
  files: DeliveryFile[];
}

@Component({
  selector: 'app-delivery',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="card p-6">

      @if (loading()) {
        <div class="animate-pulse space-y-3">
          <div class="h-4 skeleton rounded w-1/3"></div>
          <div class="h-20 skeleton rounded"></div>
        </div>

      } @else if (!delivery() && isFreelancer) {
        <!-- Freelancer: submit form -->
        <h2 class="text-base font-semibold text-neutral-900 dark:text-white mb-4">
          {{ 'delivery.submitTitle' | translate }}
        </h2>
        <div class="space-y-4">
          <div>
            <label class="input-label">{{ 'delivery.note' | translate }}</label>
            <textarea [(ngModel)]="note" rows="4" class="input resize-none"
              [placeholder]="'delivery.notePlaceholder' | translate"></textarea>
          </div>
          <div>
            <label class="input-label">{{ 'delivery.files' | translate }}</label>
            <input type="file" multiple
              (change)="onFilesSelected($event)"
              class="block w-full text-sm text-neutral-500
                     file:me-3 file:py-2 file:px-4 file:rounded-xl file:border-0
                     file:bg-brand-50 file:text-brand-700 dark:file:bg-brand-900/20
                     dark:file:text-brand-400 file:text-sm file:font-medium
                     hover:file:bg-brand-100" />
            @if (selectedFiles.length > 0) {
              <div class="mt-2 flex flex-wrap gap-2">
                @for (f of selectedFiles; track f.name) {
                  <span class="badge-gray text-xs">{{ f.name }}</span>
                }
              </div>
            }
          </div>
          <button (click)="submitDelivery()"
            [disabled]="submitting() || selectedFiles.length === 0"
            class="btn-primary w-full">
            @if (submitting()) {
              <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            }
            {{ 'delivery.submit' | translate }}
          </button>
        </div>

      } @else if (delivery()) {
        <!-- Either party: view existing delivery -->
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-semibold text-neutral-900 dark:text-white">
            {{ 'delivery.title' | translate }}
          </h2>
          <span [class]="getStatusBadge(delivery()!.status)">
            {{ getStatusLabel(delivery()!.status) }}
          </span>
        </div>

        @if (delivery()!.note) {
          <p class="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4">
            {{ delivery()!.note }}
          </p>
        }

        <!-- Files -->
        <div class="space-y-2 mb-4">
          @for (f of delivery()!.files; track f.fileId) {
            <a [href]="resolveUrl(f.fileUrl)" target="_blank"
              class="flex items-center gap-3 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 hover:border-brand-200 dark:hover:border-brand-800 transition-colors">
              <span class="text-xl">📎</span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-neutral-900 dark:text-white truncate">{{ f.fileName }}</p>
                <p class="text-xs text-neutral-400">{{ formatSize(f.sizeBytes) }}</p>
              </div>
              <span class="text-xs text-brand-600">{{ 'delivery.downloadFile' | translate }} ↓</span>
            </a>
          }
        </div>

        @if (delivery()!.status === 'AwaitingReview') {
          <p class="text-xs text-neutral-400 mb-4">
            {{ 'delivery.reviewDeadline' | translate }}
            {{ delivery()!.reviewDeadline | date:'d MMM yyyy, HH:mm' }}
          </p>

          @if (isClient) {
            <!-- Client actions -->
            @if (!showReportForm()) {
              <div class="flex gap-2">
                <button (click)="acceptDelivery()" [disabled]="acting()" class="btn-primary btn-sm flex-1">
                  ✓ {{ 'delivery.accept' | translate }}
                </button>
                <button (click)="showReportForm.set(true)" class="btn-danger btn-sm flex-1">
                  ⚠ {{ 'delivery.report' | translate }}
                </button>
              </div>
            } @else {
              <div class="space-y-3">
                <textarea [(ngModel)]="reportText" rows="3" class="input resize-none text-sm"
                  [placeholder]="'delivery.reportPlaceholder' | translate"></textarea>
                <div class="flex gap-2">
                  <button (click)="submitReport()" [disabled]="acting() || reportText.trim().length < 20"
                    class="btn-danger btn-sm flex-1">
                    {{ 'delivery.reportSubmit' | translate }}
                  </button>
                  <button (click)="showReportForm.set(false)" class="btn-ghost btn-sm">Cancel</button>
                </div>
              </div>
            }
          }
        }

        @if (delivery()!.status === 'Accepted') {
          <div class="flex items-center gap-2 bg-success-50 dark:bg-success-900/20 rounded-xl px-3 py-2">
            <span class="text-success-500">✓</span>
            <p class="text-xs text-success-700 dark:text-success-400">{{ 'delivery.accepted' | translate }}</p>
          </div>
        }

        @if (delivery()!.status === 'AutoReleased') {
          <div class="flex items-center gap-2 bg-success-50 dark:bg-success-900/20 rounded-xl px-3 py-2">
            <span class="text-success-500">✓</span>
            <p class="text-xs text-success-700 dark:text-success-400">{{ 'delivery.autoReleased' | translate }}</p>
          </div>
        }

        @if (delivery()!.status === 'Disputed') {
          <div class="flex items-center gap-2 bg-warning-50 dark:bg-warning-900/20 rounded-xl px-3 py-2">
            <span class="text-warning-500">⚠</span>
            <p class="text-xs text-warning-700 dark:text-warning-400">{{ 'delivery.disputed' | translate }}</p>
          </div>
        }
      }
    </div>
  `
})
export class DeliveryComponent implements OnInit {
  @Input({ required: true }) taskCode!: string;
  @Input() isClient = false;
  @Input() isFreelancer = false;

  private http      = inject(HttpClient);
  private toast     = inject(ToastService);
  private translate = inject(TranslateService);

  delivery        = signal<Delivery | null>(null);
  loading         = signal(true);
  submitting      = signal(false);
  acting          = signal(false);
  showReportForm  = signal(false);

  note = '';
  reportText = '';
  selectedFiles: File[] = [];

  private readonly staticBase = environment.apiUrl.replace(/\/api$/, '');

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.http.get<Delivery>(
      `${environment.apiUrl}/tasks/${this.taskCode}/delivery`
    ).subscribe({
      next: d => { this.delivery.set(d); this.loading.set(false); },
      error: () => { this.delivery.set(null); this.loading.set(false); }
    });
  }

  onFilesSelected(event: Event) {
    const files = (event.target as HTMLInputElement).files;
    if (files) this.selectedFiles = Array.from(files);
  }

  submitDelivery() {
    if (this.selectedFiles.length === 0) return;
    this.submitting.set(true);

    const fd = new FormData();
    fd.append('note', this.note);
    this.selectedFiles.forEach(f => fd.append('files', f));

    this.http.post<Delivery>(
      `${environment.apiUrl}/tasks/${this.taskCode}/delivery`, fd
    ).subscribe({
      next: d => {
        this.delivery.set(d);
        this.submitting.set(false);
        this.toast.success(this.translate.instant('delivery.submitted'));
      },
      error: err => {
        this.submitting.set(false);
        const code = err?.error?.code ?? 'SUBMIT_FAILED';
        this.toast.error(this.translate.instant(`deliveryErrors.${code}`));
      }
    });
  }

  acceptDelivery() {
    if (!this.delivery()) return;
    this.acting.set(true);
    this.http.post<Delivery>(
      `${environment.apiUrl}/tasks/${this.taskCode}/delivery/${this.delivery()!.deliveryId}/accept`,
      {}
    ).subscribe({
      next: d => {
        this.delivery.set(d);
        this.acting.set(false);
        this.toast.success(this.translate.instant('delivery.accepted'));
      },
      error: err => {
        this.acting.set(false);
        const code = err?.error?.code ?? 'ACCEPT_FAILED';
        this.toast.error(this.translate.instant(`deliveryErrors.${code}`));
      }
    });
  }

  submitReport() {
    if (!this.delivery() || this.reportText.trim().length < 20) return;
    this.acting.set(true);
    this.http.post(
      `${environment.apiUrl}/tasks/${this.taskCode}/delivery/${this.delivery()!.deliveryId}/report`,
      { report: this.reportText }
    ).subscribe({
      next: () => {
        this.acting.set(false);
        this.showReportForm.set(false);
        this.toast.warning(this.translate.instant('delivery.disputed'));
        this.load();
      },
      error: err => {
        this.acting.set(false);
        const code = err?.error?.code ?? 'REPORT_FAILED';
        this.toast.error(this.translate.instant(`deliveryErrors.${code}`));
      }
    });
  }

  resolveUrl(url: string): string {
    return url.startsWith('http') ? url : `${this.staticBase}${url}`;
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  getStatusBadge(status: string): string {
    return {
      AwaitingReview: 'badge-amber',
      Accepted:       'badge-green',
      AutoReleased:   'badge-green',
      Disputed:       'badge-red'
    }[status] ?? 'badge-gray';
  }

  getStatusLabel(status: string): string {
    return {
      AwaitingReview: this.translate.instant('delivery.awaitingReview'),
      Accepted:       '✓ Accepted',
      AutoReleased:   '✓ Auto-released',
      Disputed:       '⚠ Disputed'
    }[status] ?? status;
  }
}