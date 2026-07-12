import {
  Component, inject, OnInit, OnDestroy,
  signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { catchError, forkJoin, of } from 'rxjs';
import { TaskService } from '../../core/services/task.service';
import { DeliveryService } from '../../core/services/delivery.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { FilePreviewComponent, PreviewFile } from '../../shared/file-preview/file-preview.component';
import {
  Delivery, DeliveryLink
} from '../../core/models/delivery.models';
import { WaseetTask, Proposal } from '../../core/models/task.models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-freelancer-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink,
            TranslateModule, FilePreviewComponent],
  template: `
    <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950">

      <!-- Loading state -->
      @if (pageLoading()) {
        <div class="flex items-center justify-center min-h-screen">
          <div class="space-y-3 text-center">
            <div class="w-10 h-10 border-2 border-brand-500
                        border-t-transparent rounded-full animate-spin mx-auto">
            </div>
            <p class="text-sm text-neutral-400">Loading workspace...</p>
          </div>
        </div>
      }

      <!-- Error state -->
      @else if (loadError()) {
        <div class="flex items-center justify-center min-h-screen p-4">
          <div class="card p-8 max-w-md text-center">
            <p class="text-3xl mb-3">⚠</p>
            <p class="font-semibold text-neutral-700 dark:text-neutral-300">
              Could not load workspace
            </p>
            <p class="text-sm text-neutral-400 mt-2">{{ loadError() }}</p>
            <button (click)="loadAll()" class="btn-secondary mt-4">
              Try again
            </button>
          </div>
        </div>
      }

      <!-- Workspace loaded -->
      @else if (task()) {

        <!-- Top status bar -->
        <div [class]="statusBarClass()"
          class="border-b px-4 py-2.5 flex items-center
                 justify-between flex-wrap gap-3">
          <div class="flex items-center gap-3">
            <a [routerLink]="['/tasks', task()!.publicTaskCode]"
              class="text-sm opacity-70 hover:opacity-100 transition-opacity">
              ← {{ task()!.publicTaskCode }}
            </a>
            <span class="text-sm font-semibold text-neutral-900 dark:text-white
                         hidden sm:inline">
              {{ task()!.title }}
            </span>
          </div>
          <div class="flex items-center gap-3">
            <span [class]="deliveryStatusBadge()">
              {{ deliveryStatusLabel() }}
            </span>
            @if (delivery()?.status === 'AwaitingReview') {
              <span class="text-xs text-neutral-400 hidden sm:inline">
                Auto-releases
                {{ delivery()!.reviewDeadline | date:'d MMM' }}
              </span>
            }
            <span class="text-sm font-bold text-brand-600">
              \${{ task()!.budgetUSD }}
            </span>
          </div>
        </div>

        <div class="max-w-5xl mx-auto px-4 py-8">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

            <!-- LEFT: Main content (2/3) -->
            <div class="lg:col-span-2 space-y-5">

              <!-- Task brief -->
              <div class="card p-5">
                <h2 class="text-xs font-bold text-neutral-400 uppercase
                           tracking-wider mb-3">Task brief</h2>
                <p class="text-sm text-neutral-700 dark:text-neutral-300
                          leading-relaxed">
                  {{ task()!.description }}
                </p>
              </div>

              <!-- My proposal -->
              @if (myProposal()) {
                <div class="card p-5">
                  <h2 class="text-xs font-bold text-neutral-400 uppercase
                             tracking-wider mb-3">My proposal</h2>
                  <div class="flex items-start justify-between gap-4">
                    <div class="flex-1">
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
                    <span [class]="proposalBadge()">
                      {{ myProposal()!.statusLabel }}
                    </span>
                  </div>
                </div>
              }

              <!-- Delivery form -->
              @if (canSubmit()) {
                <div class="card p-6">
                  <div class="flex items-center justify-between mb-5">
                    <h2 class="text-base font-semibold
                               text-neutral-900 dark:text-white">
                      @if (delivery()?.status === 'RevisionRequested') {
                        Submit revised delivery
                      } @else {
                        Submit your delivery
                      }
                    </h2>
                    @if (delivery()?.status === 'RevisionRequested') {
                      <span class="badge-amber">Revision requested</span>
                    }
                  </div>

                  <div class="space-y-5">

                    
                    <!-- Note -->
                    <div>
                      <label class="input-label">Delivery note</label>
                      <textarea [(ngModel)]="note" rows="5"
                        class="input resize-none"
                        placeholder="Describe what you've completed, decisions made, how to use the deliverable...">
                      </textarea>
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
                      @if (!links.length) {
                        <p class="text-xs text-neutral-400">
                          Add staging URL, GitHub repo, Figma file...
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
                                class="w-6 h-6 rounded text-neutral-400
                                       hover:text-danger-500 hover:bg-danger-50
                                       dark:hover:bg-danger-900/20 flex items-center
                                       justify-center transition-colors text-xs
                                       flex-shrink-0">
                                ✕
                              </button>
                            </div>
                          }
                        </div>
                      }
                    </div>

                    <!-- Video URL -->
                    <div>
                      <label class="input-label">
                        Video walkthrough (optional)
                      </label>
                      <input [(ngModel)]="videoUrl" type="url" class="input"
                        placeholder="YouTube, Loom, or any video URL..." />
                    </div>

                    <!-- File upload -->
                    <div>
                      <label class="input-label">
                        Attachments (required, max 10)
                      </label>
                      <label class="flex flex-col items-center justify-center
                                    gap-2 w-full border-2 border-dashed
                                    border-neutral-200 dark:border-neutral-700
                                    rounded-2xl py-8 cursor-pointer
                                    hover:border-brand-400 dark:hover:border-brand-600
                                    transition-colors group">
                        <svg class="w-8 h-8 text-neutral-300
                                    group-hover:text-brand-400 transition-colors"
                          fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round"
                            stroke-width="1.5"
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5
                               5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                        </svg>
                        <span class="text-sm text-neutral-400
                                     group-hover:text-brand-500 transition-colors">
                          Click to select files
                        </span>
                        <span class="text-xs text-neutral-300">
                          Any file type, max 10 files
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

                    <!-- Submit -->
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

              <!-- Already submitted — view current delivery -->
              @else if (delivery() && !canSubmit()) {
                <div class="card p-5">
                  <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xs font-bold text-neutral-400 uppercase
                               tracking-wider">Current delivery</h2>
                    <span [class]="deliveryStatusBadge()">
                      {{ deliveryStatusLabel() }}
                    </span>
                  </div>

                  @if (delivery()!.note) {
                    <p class="text-sm text-neutral-600 dark:text-neutral-400
                              leading-relaxed mb-4">
                      {{ delivery()!.note }}
                    </p>
                  }

                  @if (delivery()!.files?.length) {
                    <app-file-preview
                      [files]="currentDeliveryFiles()">
                    </app-file-preview>
                  }
                </div>
              }

              <!-- Delivery history -->
              @if (deliveryHistory().length) {
                <div class="card p-5">
                  <h2 class="text-xs font-bold text-neutral-400 uppercase
                             tracking-wider mb-4">
                    Delivery history
                    ({{ deliveryHistory().length }})
                  </h2>
                  <div class="space-y-4">
                    @for (d of deliveryHistory(); track d.deliveryId) {
                      <div class="border border-neutral-100
                                  dark:border-neutral-800 rounded-xl p-4">
                        <div class="flex items-center justify-between mb-3">
                          <div class="flex items-center gap-2 flex-wrap">
                            <span class="text-xs font-semibold
                                         text-neutral-700 dark:text-neutral-300">
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

                        

                        @if (d.note) {
                          <p class="text-sm text-neutral-600
                                    dark:text-neutral-400 leading-relaxed mb-3">
                            {{ d.note }}
                          </p>
                        }

                        @if (d.files?.length) {
                          <app-file-preview [files]="mapFiles(d.files)">
                          </app-file-preview>
                        }

                        @if (d.links?.length) {
                          <div class="flex flex-wrap gap-2 mt-2">
                            @for (link of d.links; track link.url) {
                              <a [href]="link.url" target="_blank"
                                rel="noopener"
                                class="text-xs text-brand-600 hover:underline">
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

              <!-- Status timeline -->
              <div class="card p-5">
                <h2 class="text-xs font-bold text-neutral-400 uppercase
                           tracking-wider mb-4">Project status</h2>
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
                      <span class="text-sm"
                        [class]="step.active
                          ? 'font-semibold text-neutral-900 dark:text-white'
                          : step.done
                          ? 'text-neutral-400 dark:text-neutral-500'
                          : 'text-neutral-300 dark:text-neutral-600'">
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
                    @for (r of revisionRequests();
                          track r.revisionId) {
                      <div class="border border-warning-200
                                  dark:border-warning-800 rounded-xl p-3">
                        <div class="flex items-center justify-between mb-1">
                          <p class="text-xs font-semibold text-warning-700
                                    dark:text-warning-400">
                            {{ r.createdAt | date:'d MMM yyyy' }}
                          </p>
                          <span class="text-[10px] px-1.5 py-0.5 rounded
                                       bg-warning-100 dark:bg-warning-900/40
                                       text-warning-600 dark:text-warning-400">
                            {{ r.status }}
                          </span>
                        </div>
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
              <div class="card p-5">
                <h2 class="text-xs font-bold text-neutral-400 uppercase
                           tracking-wider mb-3">Quick links</h2>
                <div class="space-y-2">
                  <a [routerLink]="['/tasks', task()!.publicTaskCode]"
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
      }
    </div>
  `
})
export class FreelancerWorkspaceComponent implements OnInit {
  private route     = inject(ActivatedRoute);
  private svc       = inject(DeliveryService);
  private toast     = inject(ToastService);
  private translate = inject(TranslateService);
  private http      = inject(HttpClient);

  // ── Signals ────────────────────────────────────────────────────────────────
  task             = signal<WaseetTask | null>(null);
  delivery         = signal<Delivery | null>(null);
  deliveryHistory  = signal<Delivery[]>([]);
  myProposal       = signal<Proposal | null>(null);
  revisionRequests = signal<any[]>([]);
  pageLoading      = signal(true);
  loadError        = signal('');
  submitting       = signal(false);
  private _files   = signal<PreviewFile[]>([]);

  // ── Form state ─────────────────────────────────────────────────────────────
  note            = '';
  videoUrl        = '';
  links:     DeliveryLink[]          = [];

  // ── Computed ───────────────────────────────────────────────────────────────
  previewFiles = computed(() => this._files());

  /**
   * Fix: canSubmit waits for task to load before evaluating.
   * Task status 2 = Active, delivery RevisionRequested = needs resubmission.
   */
  canSubmit = computed(() => {
    const t  = this.task();
    const d  = this.delivery();
    if (!t) return false;                        // task not loaded yet

    const taskActive         = t.status === 2;
    const revisionRequested  = d?.status === 'RevisionRequested';

    return taskActive || revisionRequested;
  });

  currentDeliveryFiles = computed(() =>
    this.mapFiles(this.delivery()?.files ?? []));

  statusBarClass = computed(() => {
    const s = this.delivery()?.status;
    if (s === 'Accepted' || s === 'AutoReleased')
      return 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800';
    if (s === 'Disputed')
      return 'border-danger-200 dark:border-danger-800';
    return 'bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800';
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
    if (!this.delivery()) return 'Not submitted yet';
    const map: Record<string, string> = {
      AwaitingReview:    'Awaiting client review',
      RevisionRequested: 'Revision requested',
      Accepted:          'Accepted ✓',
      AutoReleased:      'Auto-released ✓',
      Disputed:          'Disputed'
    };
    return map[this.delivery()!.status] ?? this.delivery()!.status;
  });

  proposalBadge = computed(() => {
    const s = this.myProposal()?.status ?? 0;
    return ['badge-amber', 'badge-green', 'badge-red'][s] ?? 'badge-gray';
  });

  timelineSteps = computed(() => {
    const t  = this.task();
    const ds = this.delivery()?.status;

    if (!t) return [];

    return [
      {
        label:  'Task awarded',
        done:   true,
        active: false
      },
      {
        label:  'Work in progress',
        done:   !!ds,
        active: !ds && t.status === 2
      },
      {
        label:  'Delivery submitted',
        done:   !!ds && ds !== 'RevisionRequested',
        active: ds === 'RevisionRequested'
      },
      {
        label:  'Client reviewing',
        done:   ds === 'Accepted' || ds === 'AutoReleased',
        active: ds === 'AwaitingReview'
      },
      {
        label:  'Payment released',
        done:   ds === 'Accepted' || ds === 'AutoReleased',
        active: false
      },
    ];
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit() {
    const code = this.route.snapshot.paramMap.get('code')!;
    this.loadAll(code);
  }

  loadAll(code?: string) {
    const c = code ?? this.route.snapshot.paramMap.get('code')!;
    this.pageLoading.set(true);
    this.loadError.set('');

    // Fix: correct endpoint + use forkJoin so all calls finish together
    forkJoin({
      task: this.http.get<WaseetTask>(
        `${environment.apiUrl}/tasks/${c}`         // ✅ correct endpoint
      ).pipe(catchError(() => of(null))),

      delivery: this.svc.get(c).pipe(
        catchError(() => of(null))                 // 404 = no delivery yet, not an error
      ),

      history: this.http.get<Delivery[]>(
        `${environment.apiUrl}/tasks/${c}/delivery/history`
      ).pipe(catchError(() => of([]))),

      proposals: this.http.get<Proposal[]>(
        `${environment.apiUrl}/tasks/${c}/proposals`
      ).pipe(catchError(() => of([]))),

      revisions: this.http.get<any[]>(
        `${environment.apiUrl}/tasks/${c}/delivery/revisions`
      ).pipe(catchError(() => of([])))

    }).subscribe({
      next: ({ task, delivery, history, proposals, revisions }) => {

        if (!task) {
          this.loadError.set(
            'Task not found or you are not authorized to view this workspace.');
          this.pageLoading.set(false);
          return;
        }

        this.task.set(task);
        this.delivery.set(delivery);
        this.deliveryHistory.set(history);
        this.revisionRequests.set(revisions);

        // Find own proposal from the list
        const mine = proposals[0] ?? null;
        this.myProposal.set(mine);

        this.pageLoading.set(false);
      },
      error: () => {
        this.loadError.set('Something went wrong. Please try again.');
        this.pageLoading.set(false);
      }
    });
  }

  // ── File handling ──────────────────────────────────────────────────────────
  onFilesSelected(e: Event) {
    const files = Array.from(
      (e.target as HTMLInputElement).files ?? []);
    this._files.set(files.map(f => ({
      file: f, name: f.name, size: f.size, type: f.type
    })));
  }

  removeFile(f: PreviewFile) {
    this._files.update(fs => fs.filter(x => x.name !== f.name));
  }


  addLink() {
    this.links = [...this.links, { label: '', url: '' }];
  }
  removeLink(i: number) {
    this.links = this.links.filter((_, idx) => idx !== i);
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  submit() {
    if (!this._files().length || this.submitting()) return;
    this.submitting.set(true);

    const rawFiles = this._files().map(pf => pf.file!);

    this.svc.submit(
      this.task()!.publicTaskCode,
      this.note,
      rawFiles,
      this.videoUrl || undefined,
      this.links.filter(l => l.url.trim()),
    ).subscribe({
      next: d => {
        this.delivery.set(d);
        this.submitting.set(false);
        this._files.set([]);
        this.note = '';
        this.videoUrl = '';
        this.links = [];
        this.toast.success(
          'Delivery submitted!',
          'The client has been notified and has 7 days to review.');

        // Reload history to include the new delivery
        this.http.get<Delivery[]>(
          `${environment.apiUrl}/tasks/${this.task()!.publicTaskCode}/delivery/history`
        ).subscribe({ next: h => this.deliveryHistory.set(h) });
      },
      error: err => {
        this.submitting.set(false);
        const code = err?.error?.code ?? 'SUBMIT_FAILED';
        this.toast.error(
          this.translate.instant(`deliveryErrors.${code}`));
      }
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  getDeliveryBadge(status: string): string {
    return ({
      AwaitingReview:    'badge-amber',
      RevisionRequested: 'badge-blue',
      Accepted:          'badge-green',
      AutoReleased:      'badge-green',
      Disputed:          'badge-red'
    } as Record<string, string>)[status] ?? 'badge-gray';
  }

  mapFiles(files: any[]): PreviewFile[] {
    return (files ?? []).map(f => ({
      name: f.originalFileName ?? f.name ?? '',
      size: f.sizeBytes        ?? f.size ?? 0,
      type: f.contentType      ?? f.type ?? '',
      url:  this.svc.resolveFileUrl(f.fileUrl ?? f.url ?? '')
    }));
  }
}