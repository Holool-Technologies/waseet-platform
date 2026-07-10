import { Component, inject, Input, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DeliveryService } from '../../../core/services/delivery.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Delivery, DeliveryFile } from '../../../core/models/delivery.models';
import {
  FilePreviewComponent,
  PreviewFile,
} from '../../../shared/file-preview/file-preview.component';
type ClientAction = 'none' | 'revision' | 'dispute';

@Component({
  selector: 'app-delivery',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, FilePreviewComponent],
  template: `
    <div class="card p-6 space-y-5">

      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <h2 class="text-base font-semibold text-neutral-900 dark:text-white">
          {{ 'delivery.title' | translate }}
          @if (delivery()?.revisionNumber) {
            <span class="text-sm font-normal text-neutral-400 ms-1">
              ({{ 'delivery.revision' | translate }}
              {{ delivery()!.revisionNumber }}
              {{ 'delivery.of' | translate }}
              {{ delivery()!.maxRevisions }})
            </span>
          }
        </h2>
        @if (delivery()) {
          <span [class]="statusBadge()">{{ statusLabel() }}</span>
        }
      </div>

      <!-- ── FREELANCER: submit form ───────────────────────── -->
      @if (isFreelancer && !delivery()) {
        <div class="space-y-4">
          <div>
            <label class="input-label">{{ 'delivery.note' | translate }}</label>
            <textarea [(ngModel)]="note" rows="4" class="input resize-none"
              [placeholder]="'delivery.notePlaceholder' | translate">
            </textarea>
          </div>

          <div>
  <label class="input-label">{{ 'delivery.attachFiles' | translate }}</label>
  <input type="file" multiple accept="*/*"
    (change)="onFilesSelected($event)"
    class="block w-full text-sm text-neutral-500
           file:me-3 file:py-2 file:px-4 file:rounded-xl file:border-0
           file:bg-brand-50 dark:file:bg-brand-900/20
           file:text-brand-700 dark:file:text-brand-400
           file:font-medium hover:file:bg-brand-100 mb-3" />

  @if (previewFiles().length) {
    <app-file-preview
      [files]="previewFiles()"
      [removable]="true"
      [onRemove]="removeFile.bind(this)">
    </app-file-preview>
  }
</div>
            }
          </div>

          <button (click)="submitDelivery()"
            [disabled]="!selectedFiles.length || submitting()"
            class="btn-primary w-full">
            @if (submitting()) {
              <span class="w-4 h-4 border-2 border-white border-t-transparent
                           rounded-full animate-spin inline-block me-2"></span>
            }
            {{ 'delivery.submit' | translate }}
          </button>
        </div>
      }

      <!-- ── FREELANCER: resubmit after revision ──────────── -->
      @if (isFreelancer && delivery()?.status === 'RevisionRequested') {
        <div class="space-y-3">
          <p class="text-sm font-semibold text-warning-700 dark:text-warning-400">
            Revision requested — please submit an updated delivery
          </p>
          <div>
            <label class="input-label">Updated delivery note</label>
            <textarea [(ngModel)]="note" rows="3"
              class="input resize-none text-sm" placeholder="Describe what you changed...">
            </textarea>
          </div>
          <input type="file" multiple accept="*/*"
    (change)="onFilesSelected($event)"
    class="block w-full text-sm text-neutral-500
           file:me-3 file:py-2 file:px-4 file:rounded-xl file:border-0
           file:bg-brand-50 dark:file:bg-brand-900/20
           file:text-brand-700 dark:file:text-brand-400
           file:font-medium hover:file:bg-brand-100 mb-3" />

  @if (previewFiles().length) {
    <app-file-preview
      [files]="previewFiles()"
      [removable]="true"
      [onRemove]="removeFile.bind(this)">
    </app-file-preview>
  }
          <button (click)="submitDelivery()"
            [disabled]="!selectedFiles.length || submitting()"
            class="btn-primary btn-sm">
            @if (submitting()) {
              <span class="w-3 h-3 border-2 border-white border-t-transparent
                           rounded-full animate-spin inline-block me-1"></span>
            }
            Submit updated delivery
          </button>
        </div>
      }

      <!-- ── DELIVERY VIEW (both parties) ─────────────────── -->
      @if (delivery()) {
        <!-- Delivery note -->
        @if (delivery()!.note) {
          <p class="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            {{ delivery()!.note }}
          </p>
        }

        <!-- Files -->
        <!-- Replace the existing files loop with: -->
@if (delivery()!.files.length) {
  <app-file-preview [files]="deliveryPreviewFiles()"></app-file-preview>
}

        <!-- Auto-release countdown -->
        @if (delivery()!.status === 'AwaitingReview') {
          <p class="text-xs text-neutral-400 flex items-center gap-1.5">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {{ 'delivery.reviewDeadline' | translate }}
            {{ delivery()!.reviewDeadline | date:'d MMM yyyy, HH:mm' }}
          </p>

          <!-- Max revisions warning -->
          @if (isClient && delivery()!.totalRevisions >= delivery()!.maxRevisions) {
            <div class="flex items-center gap-2 bg-warning-50 dark:bg-warning-900/20
                        border border-warning-200 dark:border-warning-800
                        rounded-xl px-3 py-2">
              <span class="text-warning-500 text-sm">⚠</span>
              <p class="text-xs text-warning-700 dark:text-warning-400">
                {{ 'delivery.maxRevisionsWarning' | translate }}
              </p>
            </div>
          }
        }

        <!-- ── CLIENT ACTIONS ──────────────────────────────── -->
        @if (isClient && delivery()!.status === 'AwaitingReview') {

          @if (clientAction() === 'none') {
            <div class="flex gap-2 flex-wrap">
              <!-- Accept -->
              <button (click)="acceptDelivery()" [disabled]="acting()"
                class="btn-primary btn-sm flex-1">
                @if (acting()) {
                  <span class="w-3 h-3 border-2 border-white border-t-transparent
                               rounded-full animate-spin inline-block me-1"></span>
                }
                ✓ {{ 'delivery.acceptBtn' | translate }}
              </button>

              <!-- Request revision (only if under limit) -->
              @if (delivery()!.totalRevisions < delivery()!.maxRevisions) {
                <button (click)="clientAction.set('revision')" class="btn-secondary btn-sm">
                  ↻ {{ 'delivery.requestRevision' | translate }}
                </button>
              }

              <!-- Dispute -->
              <button (click)="clientAction.set('dispute')" class="btn-danger btn-sm">
                ⚠ {{ 'delivery.openDispute' | translate }}
              </button>
            </div>
          }

          <!-- Revision form -->
          @if (clientAction() === 'revision') {
            <div class="space-y-3 border border-neutral-100 dark:border-neutral-800
                        rounded-xl p-4">
              <p class="text-sm font-semibold text-neutral-900 dark:text-white">
                {{ 'delivery.requestRevision' | translate }}
              </p>
              <div>
                <label class="input-label">
                  {{ 'delivery.revisionReasonLabel' | translate }}
                </label>
                <textarea [(ngModel)]="revisionReason" rows="3"
                  class="input resize-none text-sm"
                  [placeholder]="'delivery.revisionReasonPlaceholder' | translate">
                </textarea>
                <p class="input-hint">
                  {{ delivery()!.totalRevisions + 1 }}
                  {{ 'delivery.of' | translate }}
                  {{ delivery()!.maxRevisions }}
                  {{ 'delivery.revisionsUsed' | translate }}
                </p>
              </div>
              <div class="flex gap-2">
                <button (click)="submitRevision()"
                  [disabled]="acting() || revisionReason.trim().length < 10"
                  class="btn-primary btn-sm flex-1">
                  {{ 'delivery.submitRevision' | translate }}
                </button>
                <button (click)="clientAction.set('none')" class="btn-ghost btn-sm">
                  Cancel
                </button>
              </div>
            </div>
          }

          <!-- Dispute form -->
          @if (clientAction() === 'dispute') {
            <div class="space-y-3">
              <p class="text-sm font-semibold text-danger-700 dark:text-danger-400">
                {{ 'delivery.openDispute' | translate }}
              </p>
              <div>
                <label class="input-label">
                  {{ 'delivery.disputeReportLabel' | translate }}
                </label>
                <textarea [(ngModel)]="disputeReport" rows="4"
                  class="input resize-none text-sm"
                  [placeholder]="'delivery.disputeReportPlaceholder' | translate">
                </textarea>
                <p class="input-hint">{{ disputeReport.trim().length }} / 20 min</p>
              </div>
              <div class="flex gap-2">
                <button (click)="submitDispute()"
                  [disabled]="acting() || disputeReport.trim().length < 20"
                  class="btn-danger btn-sm flex-1">
                  {{ 'delivery.submitDispute' | translate }}
                </button>
                <button (click)="clientAction.set('none')" class="btn-ghost btn-sm">
                  Cancel
                </button>
              </div>
            </div>
          }
        }

        <!-- ── STATUS BANNERS ──────────────────────────────── -->
        @if (delivery()!.status === 'Accepted') {
          <div class="flex items-center gap-2 bg-success-50 dark:bg-success-900/20
                      border border-success-200 dark:border-success-800
                      rounded-xl px-3 py-2.5">
            <span class="text-success-600">✓</span>
            <p class="text-sm text-success-700 dark:text-success-400">
              {{ 'delivery.acceptedMsg' | translate }}
            </p>
          </div>
        }

        @if (delivery()!.status === 'AutoReleased') {
          <div class="flex items-center gap-2 bg-success-50 dark:bg-success-900/20
                      border border-success-200 dark:border-success-800
                      rounded-xl px-3 py-2.5">
            <span class="text-success-600">✓</span>
            <p class="text-sm text-success-700 dark:text-success-400">
              {{ 'delivery.autoReleasedMsg' | translate }}
            </p>
          </div>
        }

        @if (delivery()!.status === 'Disputed') {
          <div class="flex items-center gap-2 bg-warning-50 dark:bg-warning-900/20
                      border border-warning-200 dark:border-warning-800
                      rounded-xl px-3 py-2.5">
            <span class="text-warning-600">⚠</span>
            <p class="text-sm text-warning-700 dark:text-warning-400">
              {{ 'delivery.disputedMsg' | translate }}
            </p>
          </div>
        }

        @if (delivery()!.status === 'RevisionRequested' && isClient) {
          <div class="flex items-center gap-2 bg-brand-50 dark:bg-brand-900/20
                      border border-brand-200 dark:border-brand-800
                      rounded-xl px-3 py-2.5">
            <span class="text-brand-600">↻</span>
            <p class="text-sm text-brand-700 dark:text-brand-400">
              {{ 'delivery.revisedMsg' | translate }}
            </p>
          </div>
        }
      }

      <!-- No delivery yet -->
      @if (!delivery() && !isFreelancer) {
        <div class="py-8 text-center border-2 border-dashed
                    border-neutral-200 dark:border-neutral-700 rounded-xl">
          <p class="text-sm text-neutral-400">
            {{ 'delivery.noDeliveryYet' | translate }}
          </p>
        </div>
      }

    </div>
  `,
})
export class DeliveryComponent implements OnInit {
  @Input({ required: true }) taskCode!: string;
  @Input() isClient = false;
  @Input() isFreelancer = false;

  svc = inject(DeliveryService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  // Map backend files to PreviewFile format
  deliveryPreviewFiles = computed(() =>
    (this.delivery()?.files ?? []).map(
      (f) =>
        ({
          name: f.originalFileName,
          size: f.sizeBytes,
          type: f.contentType,
          url: this.svc.resolveFileUrl(f.fileUrl),
        }) as PreviewFile,
    ),
  );
  delivery = signal<Delivery | null>(null);
  submitting = signal(false);
  acting = signal(false);
  clientAction = signal<ClientAction>('none');

  note = '';
  revisionReason = '';
  disputeReport = '';
  // Replace selectedFiles: File[] with:
  previewFiles = signal<PreviewFile[]>([]);
  statusBadge = computed(() => {
    const map: Record<string, string> = {
      AwaitingReview: 'badge-amber',
      RevisionRequested: 'badge-blue',
      Accepted: 'badge-green',
      AutoReleased: 'badge-green',
      Disputed: 'badge-red',
    };
    return map[this.delivery()?.status ?? ''] ?? 'badge-gray';
  });

  statusLabel = computed(() => {
    const map: Record<string, string> = {
      AwaitingReview: this.translate.instant('delivery.awaitingReview'),
      RevisionRequested: this.translate.instant('delivery.revisionRequested'),
      Accepted: this.translate.instant('delivery.accepted'),
      AutoReleased: this.translate.instant('delivery.autoReleased'),
      Disputed: this.translate.instant('delivery.disputed'),
    };
    return map[this.delivery()?.status ?? ''] ?? '';
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.svc.get(this.taskCode).subscribe({
      next: (d) => this.delivery.set(d),
      error: () => this.delivery.set(null),
    });
  }

  onFilesSelected(e: Event) {
    const files = Array.from((e.target as HTMLInputElement).files ?? []);
    this.previewFiles.set(
      files.map((f) => ({
        file: f,
        name: f.name,
        size: f.size,
        type: f.type,
      })),
    );
  }
  removeFile(f: PreviewFile) {
    this.previewFiles.update((fs) => fs.filter((x) => x.name !== f.name));
  }

  submitDelivery() {
    const rawFiles = this.previewFiles().map((pf) => pf.file!);
    if (!this.previewFiles().length) return;
    this.submitting.set(true);
    this.svc.submit(this.taskCode, this.note, rawFiles).subscribe({
      next: (d) => {
        this.delivery.set(d);
        this.submitting.set(false);
        this.note = '';
        this.previewFiles.set([]);
        this.toast.success(this.translate.instant('delivery.submitted'));
      },
      error: (err) => {
        this.submitting.set(false);
        this.showError(err);
      },
    });
  }

  acceptDelivery() {
    if (!this.delivery()) return;
    this.acting.set(true);
    this.svc.accept(this.taskCode, this.delivery()!.deliveryId).subscribe({
      next: (d) => {
        this.delivery.set(d);
        this.acting.set(false);
        this.toast.success(this.translate.instant('delivery.acceptedMsg'));
      },
      error: (err) => {
        this.acting.set(false);
        this.showError(err);
      },
    });
  }

  submitRevision() {
    if (!this.delivery() || this.revisionReason.trim().length < 10) return;
    this.acting.set(true);
    this.svc
      .requestRevision(this.taskCode, this.delivery()!.deliveryId, this.revisionReason)
      .subscribe({
        next: () => {
          this.acting.set(false);
          this.clientAction.set('none');
          this.revisionReason = '';
          this.toast.info(this.translate.instant('delivery.revisedMsg'));
          this.load();
        },
        error: (err) => {
          this.acting.set(false);
          this.showError(err);
        },
      });
  }

  submitDispute() {
    if (!this.delivery() || this.disputeReport.trim().length < 20) return;
    this.acting.set(true);
    this.svc.openDispute(this.taskCode, this.delivery()!.deliveryId, this.disputeReport).subscribe({
      next: () => {
        this.acting.set(false);
        this.clientAction.set('none');
        this.toast.warning(this.translate.instant('delivery.disputedMsg'));
        this.load();
      },
      error: (err) => {
        this.acting.set(false);
        this.showError(err);
      },
    });
  }

  private showError(err: any) {
    const code = err?.error?.code ?? 'UNKNOWN';
    const msg = this.translate.instant(`deliveryErrors.${code}`);
    this.toast.error(msg !== `deliveryErrors.${code}` ? msg : 'An error occurred.');
  }
}
