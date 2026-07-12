import {
  Component, inject, OnInit, signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { DeliveryService } from '../../core/services/delivery.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { FilePreviewComponent, PreviewFile } from '../../shared/file-preview/file-preview.component';
import { Delivery } from '../../core/models/delivery.models';
import { WaseetTask } from '../../core/models/task.models';
import { environment } from '../../../environments/environment';

type ClientAction = 'none' | 'revision' | 'dispute';

@Component({
  selector: 'app-client-review',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink,
            TranslateModule, FilePreviewComponent],
  template: `
    <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950">

      <!-- Status bar -->
      <div class="bg-white dark:bg-neutral-900 border-b
                  border-neutral-100 dark:border-neutral-800
                  px-4 py-2.5 flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-3">
          <a [routerLink]="['/tasks', task()?.publicTaskCode]"
            class="text-sm text-neutral-400 hover:text-neutral-600 transition-colors">
            ← {{ task()?.publicTaskCode }}
          </a>
          <span class="text-sm font-semibold text-neutral-900 dark:text-white">
            {{ task()?.title }}
          </span>
        </div>
        <div class="flex items-center gap-3">
          <span [class]="deliveryStatusBadge()">{{ deliveryStatusLabel() }}</span>
          @if (delivery()?.status === 'AwaitingReview') {
            <div class="flex items-center gap-1.5 text-xs text-neutral-500">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Auto-accepts {{ delivery()!.reviewDeadline | date:'d MMM yyyy' }}
            </div>
          }
        </div>
      </div>

      <div class="max-w-5xl mx-auto px-4 py-8">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <!-- LEFT: Delivery content (2/3) -->
          <div class="lg:col-span-2 space-y-5">

            @if (!delivery()) {
              <div class="card p-12 text-center">
                <p class="text-4xl mb-4">⏳</p>
                <p class="font-semibold text-neutral-700 dark:text-neutral-300">
                  Waiting for delivery
                </p>
                <p class="text-sm text-neutral-400 mt-2">
                  The freelancer hasn't submitted their work yet.
                </p>
              </div>
            } @else {

              <!-- Main delivery card -->
              <div class="card p-6">
                <div class="flex items-start justify-between mb-5 flex-wrap gap-3">
                  <div>
                    <h2 class="text-lg font-bold text-neutral-900 dark:text-white">
                      Delivery
                      @if (delivery()!.revisionNumber > 0) {
                        <span class="text-base font-normal text-neutral-400 ms-1">
                          (Revision {{ delivery()!.revisionNumber }})
                        </span>
                      }
                    </h2>
                    <p class="text-xs text-neutral-400 mt-0.5">
                      Submitted {{ delivery()!.submittedAt | date:'d MMM yyyy, HH:mm' }}
                    </p>
                  </div>
                </div>

                <!-- Delivery note -->
                @if (delivery()!.note) {
                  <div class="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 mb-4">
                    <p class="text-sm text-neutral-700 dark:text-neutral-300
                              leading-relaxed whitespace-pre-wrap">
                      {{ delivery()!.note }}
                    </p>
                  </div>
                }

                <!-- Files -->
                @if (delivery()!.files?.length) {
                  <div class="mb-4">
                    <p class="text-xs font-semibold text-neutral-500 uppercase
                               tracking-wider mb-2">Attached files</p>
                    <app-file-preview [files]="deliveryPreviewFiles()"></app-file-preview>
                  </div>
                }

                <!-- Links -->
                @if (delivery()!.links?.length) {
                  <div class="mb-4">
                    <p class="text-xs font-semibold text-neutral-500 uppercase
                               tracking-wider mb-2">Links</p>
                    <div class="flex flex-wrap gap-2">
                      @for (link of delivery()!.links; track link.url) {
                        <a [href]="link.url" target="_blank" rel="noopener"
                          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                                 bg-brand-50 dark:bg-brand-900/20
                                 text-brand-700 dark:text-brand-400 text-sm
                                 hover:bg-brand-100 dark:hover:bg-brand-900/40
                                 transition-colors">
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round"
                              stroke-width="2"
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0
                                 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                          </svg>
                          {{ link.label || link.url }}
                        </a>
                      }
                    </div>
                  </div>
                }

                <!-- Video embed -->
                @if (delivery()!.videoUrl) {
                  <div class="mb-4">
                    <p class="text-xs font-semibold text-neutral-500 uppercase
                               tracking-wider mb-2">Video walkthrough</p>
                    <a [href]="delivery()!.videoUrl" target="_blank" rel="noopener"
                      class="flex items-center gap-2 px-4 py-3 rounded-xl
                             bg-neutral-100 dark:bg-neutral-800 text-sm
                             text-brand-600 hover:bg-neutral-200
                             dark:hover:bg-neutral-700 transition-colors">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round"
                          stroke-width="2"
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1
                             1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                        <path stroke-linecap="round" stroke-linejoin="round"
                          stroke-width="2"
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      Watch walkthrough video
                    </a>
                  </div>
                }
              </div>

              <!-- Previous revisions -->
              @if (previousDeliveries().length) {
                <div class="card p-5">
                  <h2 class="text-sm font-bold text-neutral-500 dark:text-neutral-400
                             uppercase tracking-wider mb-4">Previous submissions</h2>
                  <div class="space-y-3">
                    @for (d of previousDeliveries(); track d.deliveryId) {
                      <div class="border border-neutral-100 dark:border-neutral-800
                                  rounded-xl p-4 opacity-70">
                        <div class="flex items-center justify-between mb-2">
                          <span class="text-xs font-semibold text-neutral-500">
                            {{ d.revisionNumber === 0
                              ? 'Initial delivery'
                              : 'Revision ' + d.revisionNumber }}
                          </span>
                          <span class="text-xs text-neutral-400">
                            {{ d.submittedAt | date:'d MMM yyyy' }}
                          </span>
                        </div>
                        @if (d.note) {
                          <p class="text-xs text-neutral-500 line-clamp-2">
                            {{ d.note }}
                          </p>
                        }
                      </div>
                    }
                  </div>
                </div>
              }
            }
          </div>

          <!-- RIGHT: Actions sidebar (1/3) -->
          <div class="space-y-4">

            @if (delivery()?.status === 'AwaitingReview') {

              <!-- Auto-release notice -->
              <div class="card p-4 border-amber-200 dark:border-amber-800
                          bg-amber-50 dark:bg-amber-900/20">
                <p class="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
                  Auto-release date
                </p>
                <p class="text-lg font-bold text-amber-800 dark:text-amber-300">
                  {{ delivery()!.reviewDeadline | date:'d MMM yyyy' }}
                </p>
                <p class="text-xs text-amber-600 dark:text-amber-500 mt-1">
                  Payment releases automatically if you don't respond.
                </p>
              </div>

              <!-- Action buttons -->
              @if (clientAction() === 'none') {
                <div class="space-y-2">
                  <button (click)="acceptDelivery()"
                    [disabled]="acting()"
                    class="btn-primary w-full py-3">
                    @if (acting() === 'accept') {
                      <span class="w-4 h-4 border-2 border-white
                                   border-t-transparent rounded-full
                                   animate-spin inline-block me-2"></span>
                    } @else {
                      ✓
                    }
                    Accept delivery & release payment
                  </button>

                  @if (delivery()!.totalRevisions < delivery()!.maxRevisions) {
                    <button (click)="clientAction.set('revision')"
                      class="btn-secondary w-full">
                      ↻ Request a revision
                    </button>
                  } @else {
                    <div class="text-xs text-neutral-400 text-center py-2">
                      Max {{ delivery()!.maxRevisions }} revisions reached
                    </div>
                  }

                  <button (click)="clientAction.set('dispute')"
                    class="btn-ghost w-full text-danger-500
                           hover:bg-danger-50 dark:hover:bg-danger-900/20">
                    ⚠ Open dispute
                  </button>
                </div>
              }

              <!-- Revision form -->
              @if (clientAction() === 'revision') {
                <div class="card p-5 space-y-3">
                  <div class="flex items-center justify-between">
                    <p class="text-sm font-semibold text-neutral-900 dark:text-white">
                      Request revision
                    </p>
                    <button (click)="clientAction.set('none')"
                      class="text-xs text-neutral-400 hover:text-neutral-600">
                      Cancel
                    </button>
                  </div>
                  <p class="text-xs text-neutral-500">
                    {{ delivery()!.totalRevisions + 1 }}
                    of {{ delivery()!.maxRevisions }} revisions
                  </p>
                  <textarea [(ngModel)]="revisionReason" rows="4"
                    class="input resize-none text-sm"
                    placeholder="Describe exactly what needs to change...">
                  </textarea>
                  <button (click)="submitRevision()"
                    [disabled]="acting() || revisionReason.trim().length < 10"
                    class="btn-primary w-full btn-sm">
                    @if (acting() === 'revision') {
                      <span class="w-3 h-3 border-2 border-white border-t-transparent
                                   rounded-full animate-spin inline-block me-1"></span>
                    }
                    Send revision request
                  </button>
                </div>
              }

              <!-- Dispute form -->
              @if (clientAction() === 'dispute') {
                <div class="card p-5 space-y-3
                            border-danger-200 dark:border-danger-800">
                  <div class="flex items-center justify-between">
                    <p class="text-sm font-semibold text-danger-700 dark:text-danger-400">
                      Open dispute
                    </p>
                    <button (click)="clientAction.set('none')"
                      class="text-xs text-neutral-400 hover:text-neutral-600">
                      Cancel
                    </button>
                  </div>
                  <p class="text-xs text-neutral-500">
                    This freezes the escrow until an admin reviews your case.
                    Please provide detailed evidence.
                  </p>
                  <textarea [(ngModel)]="disputeReport" rows="5"
                    class="input resize-none text-sm"
                    placeholder="Describe the issue in detail. What was promised vs what was delivered? Include any evidence...">
                  </textarea>
                  <p class="text-xs text-neutral-400">
                    {{ disputeReport.trim().length }} / 20 minimum characters
                  </p>
                  <button (click)="submitDispute()"
                    [disabled]="acting() || disputeReport.trim().length < 20"
                    class="btn-danger w-full btn-sm">
                    @if (acting() === 'dispute') {
                      <span class="w-3 h-3 border-2 border-white border-t-transparent
                                   rounded-full animate-spin inline-block me-1"></span>
                    }
                    Open dispute
                  </button>
                </div>
              }
            }

            <!-- Status banners for resolved states -->
            @if (delivery()?.status === 'Accepted') {
              <div class="card p-5 bg-success-50 dark:bg-success-900/20
                          border-success-200 dark:border-success-800">
                <p class="text-sm font-bold text-success-700 dark:text-success-400 mb-1">
                  ✓ Delivery accepted
                </p>
                <p class="text-xs text-success-600 dark:text-success-500">
                  Payment has been released to the freelancer.
                </p>
              </div>
            }

            @if (delivery()?.status === 'AutoReleased') {
              <div class="card p-5 bg-success-50 dark:bg-success-900/20
                          border-success-200 dark:border-success-800">
                <p class="text-sm font-bold text-success-700 dark:text-success-400 mb-1">
                  ✓ Auto-accepted
                </p>
                <p class="text-xs text-success-600 dark:text-success-500">
                  Review period expired. Payment was automatically released.
                </p>
              </div>
            }

            @if (delivery()?.status === 'Disputed') {
              <div class="card p-5 bg-warning-50 dark:bg-warning-900/20
                          border-warning-200 dark:border-warning-800">
                <p class="text-sm font-bold text-warning-700 dark:text-warning-400 mb-1">
                  ⚠ Dispute in progress
                </p>
                <p class="text-xs text-warning-600 dark:text-warning-500">
                  An admin is reviewing your case. Escrow is frozen.
                </p>
              </div>
            }

            <!-- Revision requests history -->
            @if (revisionHistory().length) {
              <div class="card p-5">
                <h2 class="text-xs font-bold text-neutral-400 uppercase
                           tracking-wider mb-3">Your revision requests</h2>
                <div class="space-y-2">
                  @for (r of revisionHistory(); track r.revisionId) {
                    <div class="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-3">
                      <p class="text-xs font-semibold text-neutral-500 mb-1">
                        {{ r.createdAt | date:'d MMM' }}
                        · <span [class]="r.status === 'Resolved' ? 'text-success-600' : 'text-amber-600'">
                          {{ r.status }}
                        </span>
                      </p>
                      <p class="text-xs text-neutral-600 dark:text-neutral-400">
                        {{ r.reason }}
                      </p>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Quick links -->
            <div class="card p-5 space-y-2">
              <h2 class="text-xs font-bold text-neutral-400 uppercase
                         tracking-wider mb-3">Quick links</h2>
              <a [routerLink]="['/tasks', task()?.publicTaskCode]"
                class="flex items-center gap-2 text-sm text-brand-600 hover:underline">
                📋 Task details
              </a>
              <a routerLink="/chat/inbox"
                class="flex items-center gap-2 text-sm text-brand-600 hover:underline">
                💬 Chat with freelancer
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ClientReviewComponent implements OnInit {
  private route   = inject(ActivatedRoute);
  private svc     = inject(DeliveryService);
  private toast   = inject(ToastService);
  private confirm = inject(ConfirmService);
  private translate = inject(TranslateService);
  private http    = inject(HttpClient);

  task            = signal<WaseetTask | null>(null);
  delivery        = signal<Delivery | null>(null);
  allDeliveries   = signal<Delivery[]>([]);
  revisionHistory = signal<any[]>([]);
  acting          = signal<string>('');
  clientAction    = signal<ClientAction>('none');

  revisionReason = '';
  disputeReport  = '';

  previousDeliveries = computed(() =>
    this.allDeliveries().slice(1));

  deliveryPreviewFiles = computed(() =>
    (this.delivery()?.files ?? []).map(f => ({
      name: f.originalFileName,
      size: f.sizeBytes,
      type: f.contentType,
      url:  this.svc.resolveFileUrl(f.fileUrl)
    } as PreviewFile))
  );

  deliveryStatusBadge = computed(() => {
    const map: Record<string, string> = {
      AwaitingReview:    'badge-amber',
      RevisionRequested: 'badge-blue',
      Accepted:          'badge-green',
      AutoReleased:      'badge-green',
      Disputed:          'badge-red'
    };
    return map[this.delivery()?.status ?? ''] ?? 'badge-gray';
  });

  deliveryStatusLabel = computed(() => {
    const map: Record<string, string> = {
      AwaitingReview:    'Awaiting your review',
      RevisionRequested: 'Revision in progress',
      Accepted:          'Accepted ✓',
      AutoReleased:      'Auto-released ✓',
      Disputed:          'Dispute in progress'
    };
    return map[this.delivery()?.status ?? ''] ?? 'No delivery yet';
  });

  ngOnInit() {
    const code = this.route.snapshot.paramMap.get('code')!;
    this.loadTask(code);
    this.loadDelivery(code);
    this.loadHistory(code);
    this.loadRevisions(code);
  }

  private loadTask(code: string) {
    this.http.get<WaseetTask>(`${environment.apiUrl}/tasks/${code}`)
      .subscribe({ next: t => this.task.set(t) });
  }

  private loadDelivery(code: string) {
    this.svc.get(code).subscribe({
      next: d  => this.delivery.set(d),
      error: () => this.delivery.set(null)
    });
  }

  private loadHistory(code: string) {
    this.http.get<Delivery[]>(
      `${environment.apiUrl}/tasks/${code}/delivery/history`
    ).subscribe({ next: h => this.allDeliveries.set(h) });
  }

  private loadRevisions(code: string) {
    this.http.get<any[]>(
      `${environment.apiUrl}/tasks/${code}/delivery/revisions`
    ).subscribe({ next: r => this.revisionHistory.set(r) });
  }

  async acceptDelivery() {
    const confirmed = await this.confirm.confirm({
      title:        'Accept this delivery?',
      description:  'Payment will be released to the freelancer immediately. This cannot be undone.',
      confirmLabel: 'Yes, accept & pay',
      danger:       false
    });
    if (!confirmed) return;

    this.acting.set('accept');
    this.confirm.setLoading(true);

    this.svc.accept(
      this.task()!.publicTaskCode,
      this.delivery()!.deliveryId
    ).subscribe({
      next: d => {
        this.delivery.set(d);
        this.acting.set('');
        this.confirm.close();
        this.toast.success('Delivery accepted! Payment released to the freelancer.');
      },
      error: err => {
        this.acting.set('');
        this.confirm.close();
        this.toast.error(this.translate.instant(
          `deliveryErrors.${err?.error?.code ?? 'ACCEPT_FAILED'}`));
      }
    });
  }

  submitRevision() {
    if (this.revisionReason.trim().length < 10) return;
    this.acting.set('revision');
    this.svc.requestRevision(
      this.task()!.publicTaskCode,
      this.delivery()!.deliveryId,
      this.revisionReason
    ).subscribe({
      next: () => {
        this.acting.set('');
        this.clientAction.set('none');
        this.revisionReason = '';
        this.toast.info('Revision requested. The freelancer has been notified.');
        this.loadDelivery(this.task()!.publicTaskCode);
        this.loadRevisions(this.task()!.publicTaskCode);
      },
      error: err => {
        this.acting.set('');
        this.toast.error(this.translate.instant(
          `deliveryErrors.${err?.error?.code ?? 'REVISION_FAILED'}`));
      }
    });
  }

  submitDispute() {
    if (this.disputeReport.trim().length < 20) return;
    this.acting.set('dispute');
    this.svc.openDispute(
      this.task()!.publicTaskCode,
      this.delivery()!.deliveryId,
      this.disputeReport
    ).subscribe({
      next: () => {
        this.acting.set('');
        this.clientAction.set('none');
        this.toast.warning('Dispute opened. An admin will review the case.');
        this.loadDelivery(this.task()!.publicTaskCode);
      },
      error: err => {
        this.acting.set('');
        this.toast.error(this.translate.instant(
          `deliveryErrors.${err?.error?.code ?? 'DISPUTE_FAILED'}`));
      }
    });
  }
}