import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { TaskService } from '../../../../core/services/task.service';
import { EscrowService } from '../../../../core/services/escrow.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { WaseetTask, Proposal, EscrowTransaction } from '../../../../core/models/task.models';
import { environment } from '../../../../../environments/environment';
import { DeliveryComponent } from '../../delivery/delivery.component';


@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule, DeliveryComponent],
  template: `
    <div class="page">
      <div class="max-w-4xl mx-auto">

        @if (loading()) {
          <div class="space-y-6">
            <div class="card p-8 animate-pulse">
              <div class="h-6 skeleton rounded w-2/3 mb-4"></div>
              <div class="h-3 skeleton rounded w-full mb-2"></div>
              <div class="h-3 skeleton rounded w-3/4"></div>
            </div>
          </div>

        } @else if (task()) {
          <div class="space-y-6">

            <!-- Task header -->
            <div class="card p-8">
              <div class="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div class="flex items-center gap-2 flex-wrap">
                  <span [class]="getStatusBadge(task()!.status)">{{ task()!.statusLabel }}</span>
                  <span class="badge-blue">{{ task()!.categoryLabel }}</span>
                </div>
                <span class="text-2xl font-bold text-brand-600">\${{ task()!.budgetUSD }}</span>
              </div>

              <h1 class="text-2xl font-bold text-neutral-900 dark:text-white mb-3">
                {{ task()!.title }}
              </h1>
              <p class="text-neutral-600 dark:text-neutral-400 leading-relaxed mb-6">
                {{ task()!.description }}
              </p>

              <div class="flex items-center gap-3 flex-wrap pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <span class="text-xs text-neutral-400">
                  Posted {{ task()!.createdAt | date:'d MMM yyyy' }}
                </span>
                <span class="text-xs text-neutral-400">·</span>
                <span class="text-xs text-neutral-400">{{ task()!.proposalCount }} bids</span>

              </div>
            </div>

            <!-- Escrow card -->
            @if (escrow()) {
              <div class="card p-6">
                <h2 class="text-base font-semibold text-neutral-900 dark:text-white mb-4">
                  Escrow Status
                </h2>
                <div class="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p class="text-2xl font-bold text-brand-600">\${{ escrow()!.amountUSD | number:'1.2-2' }}</p>
                    <p class="text-xs text-neutral-400 mt-0.5">Held since {{ escrow()!.heldAt | date:'d MMM yyyy' }}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <span [class]="getEscrowBadge(escrow()!.status)">{{ escrow()!.statusLabel }}</span>
                    @if (auth.isClient() && escrow()!.status === 0) {
                      <button (click)="releaseEscrow()" class="btn-primary btn-sm">
                        Release Payment
                      </button>
                      <button (click)="disputeEscrow()" class="btn-danger btn-sm">
                        Dispute
                      </button>
                    }
                  </div>
                </div>
              </div>
            }
            @if (task()!.status === 2 || task()!.status === 3 || task()!.status === 4 || task()!.status === 5) {
            <app-delivery
              [taskCode]="task()!.publicTaskCode"
              [isClient]="auth.isClient() && task()!.clientUserId === auth.currentUser()?.userId"
              [isFreelancer]="auth.isFreelancer() && task()!.freelancerUserId === auth.currentUser()?.userId">
            </app-delivery>
            }

            <!-- Proposals — client view -->
            @if (proposals().length > 0) {
              <div class="card p-6">
                <h2 class="text-base font-semibold text-neutral-900 dark:text-white mb-5">
                  @if (auth.isClient() && task()!.clientUserId === auth.currentUser()?.userId) {
                    Proposals ({{ proposals().length }})
                  } @else {
                    Competing Bids ({{ proposals().length }} freelancer{{ proposals().length !== 1 ? 's' : '' }} have bid)
                  }
                </h2>

                <div class="space-y-4">
                  @for (p of proposals(); track p.proposalId; let i = $index) {
                    <div class="border border-neutral-100 dark:border-neutral-800 rounded-2xl p-5 hover:border-brand-200 dark:hover:border-brand-800 transition-colors">
                      <div class="flex items-start justify-between gap-3 flex-wrap mb-3">
                        <div class="flex items-center gap-2">
                          <!-- Anonymous avatar -->
                          <div class="avatar-sm font-bold text-xs">
                            {{ i + 1 }}
                          </div>

                          <!-- Anonymous name — clickable to profile -->
                          <button
                            (click)="viewBidderProfile(p, i)"
                            class="font-semibold text-brand-600 dark:text-brand-400 hover:underline text-sm">
                            Bidder-{{ i + 1 }}
                          </button>
                          <span class="text-xs text-neutral-400">
                            · {{ p.submittedAt | date:'d MMM' }}
                          </span>
                        </div>

                        <div class="flex items-center gap-2">
                          <span class="text-lg font-bold text-brand-600">\${{ p.bidAmount }}</span>
                          @if (auth.isClient() && task()!.clientUserId === auth.currentUser()?.userId) {
                            <!-- Chat with bidder icon -->
                            <button
                              (click)="chatWithBidder(p)"
                              title="Chat with Bidder-{{ i + 1 }}"
                              class="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 flex items-center justify-center hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors">
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
                              </svg>
                            </button>

                            <!-- Award button -->
                            @if (task()!.status === 0 || task()!.status === 1) {
                              <button
                                (click)="award(p)"
                                [disabled]="awarding() === p.proposalId"
                                class="btn-primary btn-sm">
                                @if (awarding() === p.proposalId) {
                                  <span class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                } @else {
                                  🏆
                                }
                                Award
                              </button>
                            }
                          }
                        </div>
                      </div>

                      @if (p.coverLetter) {
                        <p class="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                          {{ p.coverLetter }}
                        </p>
                      }
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Submit proposal — freelancer view -->
            @if (auth.isFreelancer()
                && (task()!.status === 0 || task()!.status === 1)
                && task()!.approvalStatus === 'Approved') {
               @if (hasAlreadyBid()) {
                  <div class="card p-6 text-center">
                     <p class="text-sm text-neutral-500">✓ You have already submitted a proposal.</p>
                 </div>
                } @else {
                <div class="card p-6">
                  <h2 class="text-base font-semibold text-neutral-900 dark:text-white mb-5">
                    Submit a Proposal
                  </h2>
                  <form [formGroup]="proposalForm" (ngSubmit)="submitProposal()" class="space-y-4">
                    <div>
                      <label class="input-label">Cover Letter</label>
                      <textarea formControlName="coverLetter" rows="4"
                        class="input resize-none"
                        placeholder="Describe your approach and why you're the best fit..."></textarea>
                      @if (proposalForm.get('coverLetter')?.invalid && proposalForm.get('coverLetter')?.touched) {
                        <p class="input-error-msg">⚠ Minimum 20 characters required.</p>
                      }
                    </div>
                    <div>
                      <label class="input-label">Your Bid (USD)</label>
                      <input formControlName="bidAmount" type="number" class="input"
                        [placeholder]="'Suggested: $' + task()!.budgetUSD" />
                    </div>
                    <button type="submit" class="btn-primary w-full"
                      [disabled]="proposalForm.invalid || submittingProposal()">
                      @if (submittingProposal()) {
                        <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Submitting...
                      } @else {
                        Submit Proposal
                      }
                    </button>
                  </form>
                </div>
              }
            }

          </div>
        }

      </div>
    </div>

    <!-- Bidder profile modal -->
    @if (viewingProfile()) {
      <div class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        (click)="viewingProfile.set(null)">
        <div class="card max-w-lg w-full max-h-[90vh] overflow-y-auto animate-slide-up"
          (click)="$event.stopPropagation()">
          <div class="p-6">
            <div class="flex items-center justify-between mb-5">
              <h2 class="text-lg font-bold text-neutral-900 dark:text-white">
                {{ viewingProfile()!.alias }}
              </h2>
              <button (click)="viewingProfile.set(null)"
                class="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700">
                ✕
              </button>
            </div>

            @if (profileLoading()) {
              <div class="space-y-3 animate-pulse">
                <div class="h-4 skeleton rounded w-1/2"></div>
                <div class="h-3 skeleton rounded w-full"></div>
                <div class="h-3 skeleton rounded w-3/4"></div>
              </div>
            } @else {
              <div class="space-y-4">
                <!-- Anonymity notice -->
                <div class="flex items-center gap-2 bg-brand-50 dark:bg-brand-900/20 rounded-xl px-3 py-2">
                  <span class="text-brand-500">🛡</span>
                  <p class="text-xs text-brand-700 dark:text-brand-300">
                    Identity protected. Showing professional profile only.
                  </p>
                </div>

                @if (viewingProfile()!.profile?.title) {
                  <div>
                    <p class="text-xs text-neutral-400 uppercase tracking-wider mb-1">Title</p>
                    <p class="font-semibold text-neutral-900 dark:text-white">
                      {{ viewingProfile()!.profile.title }}
                    </p>
                  </div>
                }

                @if (viewingProfile()!.profile?.bio) {
                  <div>
                    <p class="text-xs text-neutral-400 uppercase tracking-wider mb-1">About</p>
                    <p class="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      {{ viewingProfile()!.profile.bio }}
                    </p>
                  </div>
                }

                @if (viewingProfile()!.profile?.skills?.length) {
                  <div>
                    <p class="text-xs text-neutral-400 uppercase tracking-wider mb-2">Skills</p>
                    <div class="flex flex-wrap gap-1.5">
                      @for (skill of viewingProfile()!.profile.skills; track skill) {
                        <span class="badge-blue text-xs">{{ skill }}</span>
                      }
                    </div>
                  </div>
                }

                @if (viewingProfile()!.profile?.portfolio?.length) {
                  <div>
                    <p class="text-xs text-neutral-400 uppercase tracking-wider mb-2">Portfolio</p>
                    <div class="grid grid-cols-3 gap-2">
                      @for (item of viewingProfile()!.profile.portfolio; track item.itemId) {
                        <div class="aspect-square rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                          <img [src]="resolveUrl(item.imageUrl)" [alt]="item.caption"
                            class="w-full h-full object-cover" loading="lazy" />
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- Chat with this bidder from modal -->
                <button (click)="chatFromModal()" class="btn-primary w-full">
                  💬 Chat with {{ viewingProfile()!.alias }}
                </button>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `
})
export class TaskDetailComponent implements OnInit {
  private route       = inject(ActivatedRoute);
  private router      = inject(Router);
  private taskService = inject(TaskService);
  private escrowService = inject(EscrowService);
  private http        = inject(HttpClient);
  private toast       = inject(ToastService);
  auth                = inject(AuthService);
  private fb          = inject(FormBuilder);
 private translate = inject(TranslateService);
  task             = signal<WaseetTask | null>(null);
  proposals        = signal<Proposal[]>([]);
  escrow           = signal<EscrowTransaction | null>(null);
  loading          = signal(true);
  awarding         = signal('');
  submittingProposal = signal(false);
  hasAlreadyBid    = signal(false);
  viewingProfile   = signal<{ alias: string; freelancerUserId: string; profile: any } | null>(null);
  profileLoading   = signal(false);

  proposalForm = this.fb.group({
    coverLetter: ['', [Validators.required, Validators.minLength(20)]],
    bidAmount:   [null, [Validators.required, Validators.min(1)]]
  });

  ngOnInit() {
  const code = this.route.snapshot.paramMap.get('code')!;
  this.taskService.getByCode(code).subscribe({
    next: t => {
      this.task.set(t);
      this.loading.set(false);
      this.loadProposals(code);
      if(this.auth.isFreelancer()) {
        this.hasAlreadyBid.set(t.hasSubmittedProposal);
}
      // Load escrow if client and task owner
      if (this.auth.isClient()
          && t.clientUserId === this.auth.currentUser()?.userId
          && t.status >= 2) {
        this.escrowService.getByTask(code).subscribe({
          next: e => this.escrow.set(e),
          error: () => {}
        });
      }
    },
    error: () => this.loading.set(false)
  });
  
}
private readonly staticBase = environment.apiUrl.replace(/\/api$/, '');

resolveUrl(imageUrl: string): string {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))
    return imageUrl;
  const stripped = imageUrl.replace(/^\/api\/files\//, '');
  const path = stripped.startsWith('/') ? stripped : `/${stripped}`;
  return `${this.staticBase}${path}`;
}
private loadProposals(code: string) {
  const userId = this.auth.currentUser()?.userId;
  this.taskService.getProposals(code).subscribe({
    next: (proposals: Proposal[]) => {
      this.proposals.set(proposals);
      // Fix 1+3: check if current freelancer already bid
      // if (this.auth.isFreelancer() && userId) {
      //   const mine = proposals.find(p => p.freelancerUserId === userId);
      //   this.hasAlreadyBid.set(!!mine);
      //   alert(JSON.stringify(!!mine))
      // }
    },
    error: () => {}
  });
}

  viewBidderProfile(proposal: Proposal, index: number) {
    const alias = `Bidder-${index + 1}`;
    this.viewingProfile.set({ alias, freelancerUserId: proposal.freelancerUserId, profile: null });
    this.profileLoading.set(true);

    this.http.get<any>(
      `${environment.apiUrl}/profile/anonymous/${proposal.freelancerUserId}/task/${this.task()!.taskId}`
    ).subscribe({
      next: p => {
        this.viewingProfile.set({ alias, freelancerUserId: proposal.freelancerUserId, profile: p });
        this.profileLoading.set(false);
      },
      error: () => {
        this.viewingProfile.set({ alias, freelancerUserId: proposal.freelancerUserId, profile: { bio: 'No profile available.', skills: [], portfolio: [] } });
        this.profileLoading.set(false);
      }
    });
  }

  chatWithBidder(proposal: Proposal) {
  // Get conversation ID (deterministic — same as backend)
  this.http.post<{ conversationId: string; taskCode: string; otherPartyAlias: string }>(
    `${environment.apiUrl}/chat/conversation/open`,
    {
      taskId:          this.task()!.taskId,
      freelancerUserId: proposal.freelancerUserId
    }
  ).subscribe({
    next: (res) => {
      // Navigate to inbox with conversationId to auto-select
      this.router.navigate(['/chat/inbox'], {
        queryParams: { conversationId: res.conversationId,taskId: this.task()!.taskId, freelancer: proposal.freelancerUserId,alias: res.otherPartyAlias }
      });
    },
    error: () => this.toast.error('Could not open chat')
  });
}

chatFromModal() {
  const v = this.viewingProfile();
  if (!v) return;
  this.viewingProfile.set(null);
  this.http.post<{ conversationId: string; taskCode: string; otherPartyAlias: string }>(`${environment.apiUrl}/chat/conversation/open`, {
    taskId: this.task()!.taskId,
    freelancerUserId: v.freelancerUserId
  }).subscribe({
    next: (res) => {
      this.router.navigate(['/chat/inbox'], {
        queryParams: {
          conversationId: res.conversationId,
          taskId:     this.task()!.taskId,
          freelancer: v.freelancerUserId,
          alias: res.otherPartyAlias
        }
      });
    }
  });
}

  award(proposal: Proposal) {
    if (!confirm('Award this task to Bidder? This cannot be undone.')) return;
    this.awarding.set(proposal.proposalId);
    this.taskService.awardProposal(this.task()!.publicTaskCode, proposal.proposalId).subscribe({
      next: () => {
        this.toast.success('Task awarded!', 'The freelancer has been notified.');
        this.router.navigate(['/tasks', this.task()!.publicTaskCode]);
      },
      error: () => {
        this.toast.error('Award failed');
        this.awarding.set('');
      }
    });
  }

submitProposal() {
  if (this.proposalForm.invalid || !this.task()) return;
  this.submittingProposal.set(true);

  this.taskService.submitProposal(
    this.task()!.publicTaskCode,
    this.proposalForm.value as any
  ).subscribe({
    next: (newProposal: Proposal) => {
      this.hasAlreadyBid.set(true);
      this.proposals.update(p => [...p, newProposal]);
      this.proposalForm.reset();
      this.submittingProposal.set(false);

      // لو الـ proposal اتغير — بلّغ المستخدم
      if (newProposal.wasRewritten) {
        this.toast.info(
          this.translate.instant('aiRewrite.title'),
          this.translate.instant('aiRewrite.proposal')
        );
      } else {
        this.toast.success(
          this.translate.instant('proposal.submitted')
        );
      }
    },
    error: (err) => {
      this.submittingProposal.set(false);
      const errorCode = err?.error?.code ?? 'SUBMIT_FAILED';
      const msg = this.translate.instant(`proposalErrors.${errorCode}`);
      this.toast.error(
        this.translate.instant('proposal.error'),
        msg
      );
    }
  });
}

  releaseEscrow() {
    if (!this.escrow()) return;
    this.escrowService.release(this.escrow()!.escrowId).subscribe({
      next: e => { this.escrow.set(e); this.toast.success('Payment released!'); },
      error: () => this.toast.error('Release failed')
    });
  }

  disputeEscrow() {
    if (!this.escrow()) return;
    this.escrowService.dispute(this.escrow()!.escrowId).subscribe({
      next: e => { this.escrow.set(e); this.toast.warning('Dispute raised', 'Admin will review.'); },
      error: () => this.toast.error('Dispute failed')
    });
  }

  getStatusBadge(s: number) {
    return ['badge-green','badge-blue','badge-amber','badge-gray','badge-red'][s] ?? 'badge-gray';
  }

  getEscrowBadge(s: number) {
    return ['badge-amber','badge-green','badge-red','badge-gray'][s] ?? 'badge-gray';
  }
}
