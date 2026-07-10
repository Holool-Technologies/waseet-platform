import {
  Component, inject, OnInit, OnDestroy,
  signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { TaskService } from '../../core/services/task.service';
import { DeliveryService } from '../../core/services/delivery.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { FilePreviewComponent, PreviewFile } from '../../shared/file-preview/file-preview.component';
import {
  Delivery, DeliveryLink, DeliveryChecklistItem
} from '../../core/models/delivery.models';
import { WaseetTask,Proposal } from '../../core/models/task.models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-freelancer-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink,
            TranslateModule, FilePreviewComponent],
  template: `
    <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950">

      <!-- Top status bar -->
      <div [class]="statusBarClass()"
        class="border-b px-4 py-2 flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-3">
          <a [routerLink]="['/tasks', task()?.publicTaskCode]"
            class="text-sm opacity-70 hover:opacity-100 transition-opacity">
            ← {{ task()?.publicTaskCode }}
          </a>
          <span class="text-sm font-semibold">{{ task()?.title }}</span>
        </div>
        <div class="flex items-center gap-3">
          <span [class]="deliveryStatusBadge()">{{ deliveryStatusLabel() }}</span>
          @if (delivery()?.status === 'AwaitingReview') {
            <span class="text-xs opacity-70">
              Auto-releases {{ delivery()!.reviewDeadline | date:'d MMM' }}
            </span>
          }
          <span class="text-sm font-bold text-brand-600">
            \${{ task()?.budgetUSD }}
          </span>
        </div>
      </div>

      <div class="max-w-5xl mx-auto px-4 py-8">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <!-- LEFT: Delivery form / history (2/3) -->
          <div class="lg:col-span-2 space-y-5">

            <!-- Task brief -->
            @if (task()) {
              <div class="card p-5">
                <h2 class="text-sm font-bold text-neutral-500 dark:text-neutral-400
                           uppercase tracking-wider mb-3">Task brief</h2>
                <p class="text-sm text-neutral-700 dark:text-neutral-300
                          leading-relaxed">
                  {{ task()!.description }}
                </p>
              </div>
            }

            <!-- My proposal -->
            @if (myProposal()) {
              <div class="card p-5">
                <h2 class="text-sm font-bold text-neutral-500 dark:text-neutral-400
                           uppercase tracking-wider mb-3">My proposal</h2>
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <p class="text-2xl font-bold text-brand-600">
                      \${{ myProposal()!.bidAmount }}
                    </p>
                    @if (myProposal()!.coverLetter) {
                      <p class="text-sm text-neutral-600 dark:text-neutral-400
                                mt-2 leading-relaxed">
                        {{ myProposal()!.coverLetter }}
                      </p>
                    }
                  </div>
                  <span [class]="proposalStatusBadge()">
                    {{ myProposal()!.statusLabel }}
                  </span>
                </div>
              </div>
            }

            <!-- Delivery form — only when Active or Revision Requested -->
            @if (canSubmit()) {
              <div class="card p-6">
                <div class="flex items-center justify-between mb-5">
                  <h2 class="text-base font-semibold text-neutral-900 dark:text-white">
                    @if (delivery()?.status === 'RevisionRequested') {
                      Submit revised delivery
                    } @else {
                      Submit your delivery
                    }
                  </h2>
                  @if (delivery()?.status === 'RevisionRequested') {
                    <span class="badge-amber text-xs">Revision requested</span>
                  }
                </div>

                <div class="space-y-5">

                  <!-- Progress indicator -->
                  <div>
                    <div class="flex items-center justify-between mb-1.5">
                      <label class="input-label mb-0">Completion</label>
                      <span class="text-sm font-bold text-brand-600">
                        {{ progressPercent }}%
                      </span>
                    </div>
                    <input type="range" min="0" max="100" step="5"
                      [(ngModel)]="progressPercent"
                      class="w-full accent-brand-600" />
                    <div class="flex justify-between text-xs text-neutral-400 mt-1">
                      <span>0%</span><span>50%</span><span>100%</span>
                    </div>
                  </div>

                  <!-- Delivery note -->
                  <div>
                    <label class="input-label">Delivery note</label>
                    <textarea [(ngModel)]="note" rows="5"
                      class="input resize-none"
                      placeholder="Describe what you've completed, decisions made, how to use the deliverable...">
                    </textarea>
                  </div>

                  <!-- Checklist -->
                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <label class="input-label mb-0">Completion checklist</label>
                      <button (click)="addChecklistItem()"
                        class="text-xs text-brand-600 hover:underline">
                        + Add item
                      </button>
                    </div>
                    @if (checklist.length === 0) {
                      <p class="text-xs text-neutral-400">
                        Add items to show what was completed.
                      </p>
                    } @else {
                      <div class="space-y-2">
                        @for (item of checklist; track $index; let i = $index) {
                          <div class="flex items-center gap-2">
                            <input type="checkbox" [(ngModel)]="item.done"
                              class="w-4 h-4 rounded accent-brand-600 flex-shrink-0" />
                            <input [(ngModel)]="item.item"
                              class="input flex-1 py-1.5 text-sm"
                              placeholder="Completed item..." />
                            <button (click)="removeChecklistItem(i)"
                              class="w-6 h-6 rounded-lg text-neutral-400
                                     hover:text-danger-500 hover:bg-danger-50
                                     dark:hover:bg-danger-900/20 flex items-center
                                     justify-center transition-colors flex-shrink-0
                                     text-xs">
                              ✕
                            </button>
                          </div>
                        }
                      </div>
                    }
                  </div>

                  <!-- Links -->
                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <label class="input-label mb-0">Links</label>
                      <button (click)="addLink()"
                        class="text-xs text-brand-600 hover:underline">
                        + Add link
                      </button>
                    </div>
                    @if (links.length === 0) {
                      <p class="text-xs text-neutral-400">
                        Add live preview, staging URL, GitHub repo, Figma file...
                      </p>
                    } @else {
                      <div class="space-y-2">
                        @for (link of links; track $index; let i = $index) {
                          <div class="flex items-center gap-2">
                            <input [(ngModel)]="link.label"
                              class="input w-28 py-1.5 text-sm flex-shrink-0"
                              placeholder="Label" />
                            <input [(ngModel)]="link.url"
                              class="input flex-1 py-1.5 text-sm"
                              placeholder="https://..." />
                            <button (click)="removeLink(i)"
                              class="w-6 h-6 rounded-lg text-neutral-400
                                     hover:text-danger-500 hover:bg-danger-50
                                     dark:hover:bg-danger-900/20 flex items-center
                                     justify-center transition-colors flex-shrink-0
                                     text-xs">
                              ✕
                            </button>
                          </div>
                        }
                      </div>
                    }
                  </div>

                  <!-- Video URL -->
                  <div>
                    <label class="input-label">Video walkthrough URL (optional)</label>
                    <input [(ngModel)]="videoUrl" type="url"
                      class="input"
                      placeholder="YouTube, Loom, or any video URL..." />
                    <p class="input-hint">
                      Record a short walkthrough to explain your work.
                    </p>
                  </div>

                  <!-- File upload -->
                  <div>
                    <label class="input-label">
                      Attachments (required, max 10)
                    </label>
                    <label class="flex items-center justify-center gap-2 w-full
                                  border-2 border-dashed border-neutral-200
                                  dark:border-neutral-700 rounded-2xl py-8
                                  cursor-pointer hover:border-brand-400
                                  dark:hover:border-brand-600 transition-colors
                                  group">
                      <svg class="w-6 h-6 text-neutral-400 group-hover:text-brand-500
                                  transition-colors" fill="none"
                        stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round"
                          stroke-width="1.5"
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5
                             5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                      </svg>
                      <span class="text-sm text-neutral-500
                                   group-hover:text-brand-600 transition-colors">
                        Click to select files
                      </span>
                      <input type="file" multiple class="hidden"
                        (change)="onFilesSelected($event)" />
                    </label>

                    @if (previewFiles().length) {
                      <div class="mt-3">
                        <app-file-preview
                          [files]="previewFiles()"
                          [removable]="true"
                          [onRemove]="removeFile.bind(this)">
                        </app-file-preview>
                      </div>
                    }
                  </div>

                  <!-- Submit button -->
                  <button (click)="submit()"
                    [disabled]="!previewFiles().length || submitting()"
                    class="btn-primary w-full py-3 text-base">
                    @if (submitting()) {
                      <span class="w-5 h-5 border-2 border-white
                                   border-t-transparent rounded-full
                                   animate-spin inline-block me-2"></span>
                      Submitting...
                    } @else {
                      🚀 Submit delivery
                    }
                  </button>
                </div>
              </div>
            }

            <!-- Delivery history -->
            @if (deliveryHistory().length) {
              <div class="card p-5">
                <h2 class="text-sm font-bold text-neutral-500 dark:text-neutral-400
                           uppercase tracking-wider mb-4">
                  Delivery history
                </h2>
                <div class="space-y-4">
                  @for (d of deliveryHistory(); track d.deliveryId) {
                    <div class="border border-neutral-100 dark:border-neutral-800
                                rounded-xl p-4">
                      <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-2">
                          <span class="text-xs font-semibold">
                            {{ d.revisionNumber === 0
                               ? 'Initial delivery'
                               : 'Revision ' + d.revisionNumber }}
                          </span>
                          <span [class]="getDeliveryBadge(d.status)">
                            {{ d.status }}
                          </span>
                        </div>
                        <span class="text-xs text-neutral-400">
                          {{ d.submittedAt | date:'d MMM yyyy' }}
                        </span>
                      </div>

                      <!-- Progress bar -->
                      @if (d.progressPercent < 100) {
                        <div class="mb-3">
                          <div class="flex justify-between text-xs text-neutral-400 mb-1">
                            <span>Progress</span>
                            <span>{{ d.progressPercent }}%</span>
                          </div>
                          <div class="h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full">
                            <div class="h-1.5 bg-brand-500 rounded-full transition-all"
                              [style.width.%]="d.progressPercent"></div>
                          </div>
                        </div>
                      }

                      @if (d.note) {
                        <p class="text-sm text-neutral-600 dark:text-neutral-400
                                  leading-relaxed mb-3">
                          {{ d.note }}
                        </p>
                      }

                      @if (d.files?.length) {
                        <app-file-preview
                          [files]="mapToPreview(d.files)">
                        </app-file-preview>
                      }

                      @if (d.links?.length) {
                        <div class="flex flex-wrap gap-2 mt-2">
                          @for (link of d.links; track link.url) {
                            <a [href]="link.url" target="_blank" rel="noopener"
                              class="text-xs text-brand-600 hover:underline
                                     flex items-center gap-1">
                              🔗 {{ link.label || link.url }}
                            </a>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          <!-- RIGHT: Sidebar (1/3) -->
          <div class="space-y-4">

            <!-- Current status card -->
            <div class="card p-5">
              <h2 class="text-xs font-bold text-neutral-400 uppercase
                         tracking-wider mb-3">Status</h2>

              <!-- Timeline steps -->
              <div class="space-y-3">
                @for (step of timelineSteps(); track step.label) {
                  <div class="flex items-center gap-3">
                    <div [class]="step.done
                      ? 'w-5 h-5 rounded-full bg-success-500 flex items-center justify-center flex-shrink-0'
                      : step.active
                      ? 'w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0 animate-pulse'
                      : 'w-5 h-5 rounded-full border-2 border-neutral-200 dark:border-neutral-700 flex-shrink-0'">
                      @if (step.done) {
                        <svg class="w-3 h-3 text-white" fill="none"
                          stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round"
                            stroke-width="3" d="M5 13l4 4L19 7"/>
                        </svg>
                      } @else if (step.active) {
                        <div class="w-2 h-2 bg-white rounded-full"></div>
                      }
                    </div>
                    <span [class]="step.active
                      ? 'text-sm font-semibold text-neutral-900 dark:text-white'
                      : step.done
                      ? 'text-sm text-neutral-500 dark:text-neutral-400 line-through'
                      : 'text-sm text-neutral-400 dark:text-neutral-600'">
                      {{ step.label }}
                    </span>
                  </div>
                }
              </div>
            </div>

            <!-- Revision requests -->
            @if (revisionRequests().length) {
              <div class="card p-5">
                <h2 class="text-xs font-bold text-neutral-400 uppercase
                           tracking-wider mb-3">Revision requests</h2>
                <div class="space-y-3">
                  @for (r of revisionRequests(); track r.revisionId) {
                    <div class="bg-warning-50 dark:bg-warning-900/20
                                border border-warning-200 dark:border-warning-800
                                rounded-xl p-3">
                      <p class="text-xs text-warning-600 dark:text-warning-400
                                font-semibold mb-1">
                        {{ r.createdAt | date:'d MMM yyyy' }}
                      </p>
                      <p class="text-xs text-neutral-700 dark:text-neutral-300
                                leading-relaxed">
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
                class="flex items-center gap-2 text-sm text-brand-600
                       hover:underline">
                📋 View task details
              </a>
              <a routerLink="/chat/inbox"
                class="flex items-center gap-2 text-sm text-brand-600
                       hover:underline">
                💬 Open chat
              </a>
              <a routerLink="/profile"
                class="flex items-center gap-2 text-sm text-brand-600
                       hover:underline">
                💰 View my balance
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class FreelancerWorkspaceComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private svc   = inject(DeliveryService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private http  = inject(HttpClient);

  task             = signal<WaseetTask | null>(null);
  delivery         = signal<Delivery | null>(null);
  deliveryHistory  = signal<Delivery[]>([]);
  myProposal       = signal<Proposal | null>(null);
  revisionRequests = signal<any[]>([]);
  submitting       = signal(false);
  selectedFiles    = signal<PreviewFile[]>([]);

  // Form state
  note            = '';
  videoUrl        = '';
  progressPercent = 100;
  checklist: DeliveryChecklistItem[] = [];
  links:     DeliveryLink[]          = [];

  previewFiles = computed(() => this.selectedFiles());

  canSubmit = computed(() => {
    const s = this.task()?.status;
    const ds = this.delivery()?.status;
    return s === 2 || ds === 'RevisionRequested';
  });

  statusBarClass = computed(() => {
    const s = this.delivery()?.status;
    const base = 'bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800';
    if (s === 'AwaitingReview') return `${base}`;
    if (s === 'Accepted' || s === 'AutoReleased')
      return 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800';
    if (s === 'Disputed')
      return 'bg-danger-50 dark:bg-danger-900/20 border-danger-200 dark:border-danger-800';
    return base;
  });

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
      AwaitingReview:    'Awaiting review',
      RevisionRequested: 'Revision requested',
      Accepted:          'Accepted ✓',
      AutoReleased:      'Auto-released ✓',
      Disputed:          'Disputed'
    };
    return map[this.delivery()?.status ?? ''] ?? 'Not submitted';
  });

  proposalStatusBadge = computed(() => {
    const s = this.myProposal()?.status ?? 0;
    return ['badge-amber', 'badge-green', 'badge-red'][s] ?? 'badge-gray';
  });

  timelineSteps = computed(() => {
    const ds = this.delivery()?.status;
    return [
      { label: 'Task awarded',       done: true,             active: false },
      { label: 'Work in progress',   done: !!ds,             active: !ds },
      { label: 'Delivery submitted', done: !!ds && ds !== 'RevisionRequested',
                                                             active: ds === 'RevisionRequested' },
      { label: 'Client reviewing',   done: ds === 'Accepted' || ds === 'AutoReleased',
                                                             active: ds === 'AwaitingReview' },
      { label: 'Payment released',   done: ds === 'Accepted' || ds === 'AutoReleased',
                                                             active: false },
    ];
  });

  ngOnInit() {
    const code = this.route.snapshot.paramMap.get('code')!;
    this.loadTask(code);
    this.loadDelivery(code);
    this.loadHistory(code);
    this.loadProposal(code);
    this.loadRevisions(code);
  }

  private loadTask(code: string) {
    this.http.get<WaseetTask>(`${environment.apiUrl}/tasks/code/${code}`)
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
    ).subscribe({ next: h => this.deliveryHistory.set(h) });
  }

  private loadProposal(code: string) {
    this.http.get<any[]>(
      `${environment.apiUrl}/tasks/${code}/proposals`
    ).subscribe({ next: ps => this.myProposal.set(ps[0] ?? null) });
  }

  private loadRevisions(code: string) {
    this.http.get<any[]>(
      `${environment.apiUrl}/tasks/${code}/delivery/revisions`
    ).subscribe({ next: r => this.revisionRequests.set(r) });
  }

  onFilesSelected(e: Event) {
    const files = Array.from((e.target as HTMLInputElement).files ?? []);
    this.selectedFiles.set(files.map(f => ({
      file: f, name: f.name, size: f.size, type: f.type
    })));
  }

  removeFile(f: PreviewFile) {
    this.selectedFiles.update(fs => fs.filter(x => x.name !== f.name));
  }

  addChecklistItem() {
    this.checklist = [...this.checklist, { item: '', done: false }];
  }

  removeChecklistItem(i: number) {
    this.checklist = this.checklist.filter((_, idx) => idx !== i);
  }

  addLink() {
    this.links = [...this.links, { label: '', url: '' }];
  }

  removeLink(i: number) {
    this.links = this.links.filter((_, idx) => idx !== i);
  }

  submit() {
    if (!this.selectedFiles().length) return;
    this.submitting.set(true);
    const rawFiles = this.selectedFiles().map(pf => pf.file!);

    this.svc.submit(
      this.task()!.publicTaskCode,
      this.note,
      rawFiles,
      this.videoUrl,
      this.links.filter(l => l.url.trim()),
      this.checklist.filter(c => c.item.trim()),
      this.progressPercent
    ).subscribe({
      next: d => {
        this.delivery.set(d);
        this.submitting.set(false);
        this.selectedFiles.set([]);
        this.note = '';
        this.videoUrl = '';
        this.links = [];
        this.checklist = [];
        this.progressPercent = 100;
        this.loadHistory(this.task()!.publicTaskCode);
        this.toast.success('Delivery submitted! The client has been notified.');
      },
      error: err => {
        this.submitting.set(false);
        const code = err?.error?.code ?? 'SUBMIT_FAILED';
        this.toast.error(
          this.translate.instant(`deliveryErrors.${code}`));
      }
    });
  }

  getDeliveryBadge(status: string): string {
    return {
      AwaitingReview:    'badge-amber',
      RevisionRequested: 'badge-blue',
      Accepted:          'badge-green',
      AutoReleased:      'badge-green',
      Disputed:          'badge-red'
    }[status] ?? 'badge-gray';
  }

  mapToPreview(files: any[]): PreviewFile[] {
    return files.map(f => ({
      name: f.originalFileName,
      size: f.sizeBytes,
      type: f.contentType,
      url:  this.svc.resolveFileUrl(f.fileUrl)
    }));
  }
}