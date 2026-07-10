import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { DeliveryService } from '../../../core/services/delivery.service';
import { ToastService } from '../../../core/services/toast.service';
import { FilePreviewComponent, PreviewFile } from '../../../shared/file-preview/file-preview.component';
import { environment } from '../../../../environments/environment';

interface DisputeCase {
  dispute: any;
  allDeliveries: any[];
  allRevisions: any[];
  timeline: any[];
  chatHistory: any[];
}

@Component({
  selector: 'app-admin-dispute-case',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, FilePreviewComponent],
  template: `
    <div class="page max-w-5xl">

      @if (loading()) {
        <div class="space-y-4 animate-pulse">
          <div class="h-8 skeleton rounded w-1/3"></div>
          <div class="h-48 skeleton rounded"></div>
          <div class="h-48 skeleton rounded"></div>
        </div>

      } @else if (caseData()) {
        <div class="space-y-6">

          <!-- Header -->
          <div class="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 class="section-title">Dispute Case</h1>
              <p class="section-sub">
                Opened {{ caseData()!.dispute.createdAt | date:'d MMM yyyy, HH:mm' }}
                · Status: <strong>{{ caseData()!.dispute.status }}</strong>
              </p>
            </div>
            <span [class]="caseData()!.dispute.status === 'Open'
              ? 'badge-amber' : 'badge-blue'">
              {{ caseData()!.dispute.status }}
            </span>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

            <!-- Left: Case evidence (2/3 width) -->
            <div class="lg:col-span-2 space-y-5">

              <!-- Client report -->
              <div class="card p-5">
                <h2 class="text-sm font-bold text-neutral-900 dark:text-white
                           uppercase tracking-wider mb-3">
                  Client Report
                </h2>
                <p class="text-sm text-neutral-700 dark:text-neutral-300
                          leading-relaxed bg-danger-50 dark:bg-danger-900/20
                          border border-danger-200 dark:border-danger-800
                          rounded-xl p-4">
                  {{ caseData()!.dispute.report }}
                </p>
              </div>

              <!-- Delivery history -->
              <div class="card p-5">
                <h2 class="text-sm font-bold text-neutral-900 dark:text-white
                           uppercase tracking-wider mb-4">
                  Delivery History ({{ caseData()!.allDeliveries.length }})
                </h2>
                <div class="space-y-4">
                  @for (d of caseData()!.allDeliveries; track d.deliveryId) {
                    <div class="border border-neutral-100 dark:border-neutral-800
                                rounded-xl p-4">
                      <div class="flex items-center justify-between mb-2">
                        <span class="text-xs font-semibold text-neutral-500">
                          {{ d.revisionNumber === 0
                            ? 'Initial delivery'
                            : 'Revision ' + d.revisionNumber }}
                        </span>
                        <span class="text-xs text-neutral-400">
                          {{ d.submittedAt | date:'d MMM yyyy, HH:mm' }}
                        </span>
                      </div>
                      @if (d.note) {
                        <p class="text-sm text-neutral-600 dark:text-neutral-400
                                  mb-3 leading-relaxed">
                          {{ d.note }}
                        </p>
                      }
                      @if (d.files?.length) {
                        <app-file-preview
                          [files]="mapFiles(d.files)">
                        </app-file-preview>
                      }
                    </div>
                  }
                </div>
              </div>

              <!-- Revision requests -->
              @if (caseData()!.allRevisions.length) {
                <div class="card p-5">
                  <h2 class="text-sm font-bold text-neutral-900 dark:text-white
                             uppercase tracking-wider mb-4">
                    Revision Requests ({{ caseData()!.allRevisions.length }})
                  </h2>
                  <div class="space-y-3">
                    @for (r of caseData()!.allRevisions; track r.revisionId) {
                      <div class="border border-warning-200 dark:border-warning-800
                                  bg-warning-50 dark:bg-warning-900/10
                                  rounded-xl p-4">
                        <p class="text-xs text-warning-600 dark:text-warning-400
                                  font-semibold mb-1">
                          {{ r.createdAt | date:'d MMM yyyy, HH:mm' }}
                        </p>
                        <p class="text-sm text-neutral-700 dark:text-neutral-300
                                  leading-relaxed">
                          {{ r.reason }}
                        </p>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Chat history -->
              <div class="card p-5">
                <h2 class="text-sm font-bold text-neutral-900 dark:text-white
                           uppercase tracking-wider mb-4">
                  Chat History ({{ caseData()!.chatHistory.length }} messages)
                </h2>
                @if (!caseData()!.chatHistory.length) {
                  <p class="text-sm text-neutral-400">No messages exchanged.</p>
                } @else {
                  <div class="space-y-2 max-h-64 overflow-y-auto">
                    @for (m of caseData()!.chatHistory; track m.sentAt) {
                      <div [class]="m.senderRole === 'Client'
                        ? 'flex justify-end'
                        : 'flex justify-start'">
                        <div class="max-w-[80%]">
                          <p [class]="m.senderRole === 'Client'
                            ? 'text-[10px] text-neutral-400 text-end mb-0.5 me-1'
                            : 'text-[10px] text-neutral-400 ms-1 mb-0.5'">
                            {{ m.senderRole }}
                            · {{ m.sentAt | date:'HH:mm' }}
                          </p>
                          <div [class]="m.senderRole === 'Client'
                            ? 'bg-brand-600 text-white rounded-2xl rounded-br-sm px-3 py-2 text-sm'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-2xl rounded-bl-sm px-3 py-2 text-sm'">
                            {{ m.content }}
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Timeline -->
              <div class="card p-5">
                <h2 class="text-sm font-bold text-neutral-900 dark:text-white
                           uppercase tracking-wider mb-4">
                  Activity Timeline
                </h2>
                <div class="relative">
                  <div class="absolute start-3 top-0 bottom-0 w-px
                              bg-neutral-200 dark:bg-neutral-700"></div>
                  <div class="space-y-4 ps-8">
                    @for (log of caseData()!.timeline; track log.logId) {
                      <div class="relative">
                        <div class="absolute -start-5 w-2.5 h-2.5 rounded-full
                                    bg-brand-500 ring-2 ring-white
                                    dark:ring-neutral-900"></div>
                        <p class="text-xs font-semibold text-neutral-700
                                  dark:text-neutral-300">
                          {{ log.eventType }}
                        </p>
                        <p class="text-xs text-neutral-400">
                          {{ log.actorType }}
                          · {{ log.occurredAt | date:'d MMM yyyy, HH:mm' }}
                        </p>
                      </div>
                    }
                  </div>
                </div>
              </div>

            </div>

            <!-- Right: Admin decision panel (1/3 width) -->
            <div class="lg:col-span-1">
              <div class="card p-5 sticky top-20 space-y-4">
                <h2 class="text-sm font-bold text-neutral-900 dark:text-white
                           uppercase tracking-wider">
                  Admin Decision
                </h2>

                @if (caseData()!.dispute.status === 'Resolved') {
                  <div class="bg-success-50 dark:bg-success-900/20
                              border border-success-200 dark:border-success-800
                              rounded-xl p-4">
                    <p class="text-sm font-semibold text-success-700
                              dark:text-success-400 mb-1">
                      Resolved: {{ caseData()!.dispute.resolution }}
                    </p>
                    <p class="text-xs text-neutral-500">
                      {{ caseData()!.dispute.adminNotes }}
                    </p>
                  </div>
                } @else {

                  @if (caseData()!.dispute.status === 'Open') {
                    <button (click)="claim()" [disabled]="claiming()"
                      class="btn-secondary w-full btn-sm">
                      @if (claiming()) {
                        <span class="w-3 h-3 border-2 border-neutral-500
                                     border-t-transparent rounded-full
                                     animate-spin inline-block me-1"></span>
                      }
                      Claim this dispute
                    </button>
                  }

                  @if (caseData()!.dispute.status === 'UnderAdminReview') {
                    <div class="space-y-3">
                      <p class="text-xs text-brand-600 dark:text-brand-400
                                font-medium">
                        ✓ You have claimed this dispute
                      </p>

                      <div>
                        <label class="input-label text-xs">
                          Decision notes (sent to both parties)
                        </label>
                        <textarea [(ngModel)]="adminNotes" rows="4"
                          class="input resize-none text-sm"
                          placeholder="Explain your decision clearly...">
                        </textarea>
                      </div>

                      <!-- Optional partial amounts -->
                      <details class="text-xs">
                        <summary class="cursor-pointer text-neutral-500
                                        hover:text-neutral-700 dark:hover:text-neutral-300">
                          Override amounts (optional)
                        </summary>
                        <div class="space-y-2 mt-2">
                          <div>
                            <label class="input-label text-xs">
                              To freelancer ($)
                            </label>
                            <input type="number" min="0" step="0.01"
                              [(ngModel)]="freelancerAmount"
                              class="input text-sm" />
                          </div>
                          <div>
                            <label class="input-label text-xs">
                              Refund to client ($)
                            </label>
                            <input type="number" min="0" step="0.01"
                              [(ngModel)]="clientAmount"
                              class="input text-sm" />
                          </div>
                        </div>
                      </details>

                      <div class="space-y-2">
                        <button
                          (click)="resolve('FavorFreelancer')"
                          [disabled]="resolving() || !adminNotes.trim()"
                          class="btn-primary w-full btn-sm">
                          @if (resolving() === 'FavorFreelancer') {
                            <span class="w-3 h-3 border-2 border-white
                                         border-t-transparent rounded-full
                                         animate-spin inline-block me-1"></span>
                          }
                          ✓ Release to Freelancer
                        </button>
                        <button
                          (click)="resolve('FavorClient')"
                          [disabled]="resolving() || !adminNotes.trim()"
                          class="btn-secondary w-full btn-sm">
                          @if (resolving() === 'FavorClient') {
                            <span class="w-3 h-3 border-2 border-neutral-500
                                         border-t-transparent rounded-full
                                         animate-spin inline-block me-1"></span>
                          }
                          ↩ Refund to Client
                        </button>
                      </div>
                    </div>
                  }
                }
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class AdminDisputeCaseComponent implements OnInit {
  private route     = inject(ActivatedRoute);
  private router    = inject(Router);
  private http      = inject(HttpClient);
  private svc       = inject(DeliveryService);
  private toast     = inject(ToastService);
  private translate = inject(TranslateService);

  caseData  = signal<DisputeCase | null>(null);
  loading   = signal(true);
  claiming  = signal(false);
  resolving = signal('');

  adminNotes      = '';
  freelancerAmount?: number;
  clientAmount?:    number;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('disputeId')!;
    this.load(id);
  }

  load(id: string) {
    this.loading.set(true);
    this.http.get<DisputeCase>(
      `${environment.apiUrl}/admin/disputes/${id}/case`
    ).subscribe({
      next: d => { this.caseData.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  claim() {
    const id = this.caseData()!.dispute.disputeId;
    this.claiming.set(true);
    this.svc.claimDispute(id).subscribe({
      next: () => { this.claiming.set(false); this.load(id); },
      error: () => this.claiming.set(false)
    });
  }

  resolve(resolution: string) {
    const id = this.caseData()!.dispute.disputeId;
    if (!this.adminNotes.trim()) return;
    this.resolving.set(resolution);
    this.svc.resolveDispute(
      id, resolution, this.adminNotes,
      this.freelancerAmount, this.clientAmount
    ).subscribe({
      next: () => {
        this.resolving.set('');
        this.toast.success('Dispute resolved.');
        this.router.navigate(['/admin/disputes']);
      },
      error: (err) => {
        this.resolving.set('');
        const code = err?.error?.code ?? 'UNKNOWN';
        this.toast.error(
          this.translate.instant(`deliveryErrors.${code}`));
      }
    });
  }

  mapFiles(files: any[]): PreviewFile[] {
    return files.map(f => ({
      name: f.originalFileName,
      size: f.sizeBytes,
      type: f.contentType,
      url:  this.svc.resolveFileUrl(f.fileUrl)
    }));
  }
}