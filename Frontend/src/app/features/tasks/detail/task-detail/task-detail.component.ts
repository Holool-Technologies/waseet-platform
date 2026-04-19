import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { TaskService } from '../../../../core/services/task.service';
import { EscrowService } from '../../../../core/services/escrow.service';
import { AuthService } from '../../../../core/services/auth.service';
import { WaseetTask, Proposal, EscrowTransaction } from '../../../../core/models/task.models';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="max-w-4xl mx-auto px-4 py-10">
      @if (task()) {
        <div class="space-y-6">
          <!-- Header -->
          <div class="card p-8">
            <div class="flex items-start justify-between mb-4">
              <span class="text-xs font-mono text-gray-400">{{ task()!.publicTaskCode }}</span>
              <span class="badge-status bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                {{ statusLabel(task()!.status) }}
              </span>
            </div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-3">{{ task()!.title }}</h1>
            <p class="text-gray-600 dark:text-gray-400 mb-6">{{ task()!.description }}</p>
            <div class="flex items-center justify-between">
              <span class="text-2xl font-bold text-primary-500">\${{ task()!.budgetUSD }}</span>
              <a [routerLink]="['/chat', task()!.taskId]" class="btn-primary">
                {{ 'chat.typeMessage' | translate }}
              </a>
            </div>
          </div>

          <!-- Escrow status -->
          @if (escrow()) {
            <div class="card p-6">
              <h2 class="font-semibold text-gray-900 dark:text-white mb-4">{{ 'escrow.status' | translate }}</h2>
              <div class="flex items-center justify-between">
                <span class="text-lg font-bold text-primary-500">\${{ escrow()!.amountUSD }}</span>
                <div class="flex gap-3">
                  @if (auth.isClient() && escrow()!.status === 0) {
                    <button (click)="releaseEscrow()" class="btn-primary text-sm">
                      {{ 'escrow.release' | translate }}
                    </button>
                    <button (click)="disputeEscrow()" class="btn-outline text-sm text-red-500 border-red-300">
                      {{ 'escrow.dispute' | translate }}
                    </button>
                  }
                </div>
              </div>
            </div>
          }

          <!-- Show proposals to both client (full) and freelancer (anonymized competing bids) -->
          @if (proposals().length > 0) {
            <div class="card p-6">
              <h2 class="font-semibold text-gray-900 dark:text-white mb-4">
                @if (auth.isClient()) { Proposals ({{ proposals().length }}) }
                @else { Competing Bids — {{ proposals().length }} freelancer(s) have bid on this task }
              </h2>
              <div class="space-y-3">
                @for (p of proposals(); track p.proposalId || p.bidAmount) {
                  <div class="border border-gray-100 dark:border-gray-700 rounded-xl p-4">
                    <div class="flex items-center justify-between mb-2">
                      <span class="font-bold text-primary-500">\${{ p.bidAmount }}</span>
                      <div class="flex items-center gap-3">
                        <span class="text-xs text-gray-400">{{ p.submittedAt | date:'d MMM' }}</span>
                        @if (auth.isClient() && (task()!.status === 0 || task()!.status === 1)) {
                          <button (click)="award(p.proposalId)" class="btn-primary text-xs px-3 py-1.5">
                            Award
                          </button>
                        }
                      </div>
                    </div>
                    @if (auth.isClient() && p.coverLetter) {
                      <p class="text-sm text-gray-600 dark:text-gray-400">{{ p.coverLetter }}</p>
                    }
                    @if (auth.isFreelancer()) {
                      <p class="text-xs text-gray-400 italic">Bid details hidden to protect anonymity</p>
                    }
                  </div>
                }
              </div>
            </div>
          }

          <!-- Submit proposal (freelancer only) -->
          @if (showProposalForm()) {
            <div class="card p-6">
              <h2 class="font-semibold text-gray-900 dark:text-white mb-4">{{ 'task.submitProposal' | translate }}</h2>
              <form [formGroup]="proposalForm" (ngSubmit)="submitProposal()" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{{ 'proposal.coverLetter' | translate }}</label>
                  <textarea formControlName="coverLetter" rows="4" class="input-field resize-none"></textarea>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{{ 'proposal.bidAmount' | translate }}</label>
                  <input formControlName="bidAmount" type="number" class="input-field" />
                </div>
                <button type="submit" class="btn-primary w-full" [disabled]="proposalForm.invalid">
                  {{ 'proposal.submit' | translate }}
                </button>
              </form>
            </div>
          }
        </div>
      } @else {
        <div class="flex items-center justify-center py-20">
          <div class="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    </div>
  `
})
export class TaskDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private taskService = inject(TaskService);
  private escrowService = inject(EscrowService);
  auth = inject(AuthService);
  private fb = inject(FormBuilder);

  task = signal<WaseetTask | null>(null);
  proposals = signal<Proposal[]>([]);
  escrow = signal<EscrowTransaction | null>(null);

  proposalForm = this.fb.group({
    coverLetter: ['', [Validators.required, Validators.minLength(20)]],
    bidAmount: [null, [Validators.required, Validators.min(1)]]
  });

  ngOnInit() {
    const code = this.route.snapshot.paramMap.get('code')!;
    this.taskService.getByCode(code).subscribe(t => {
      this.task.set(t);
      this.taskService.getProposals(code).subscribe(p => this.proposals.set(p));
      if (this.auth.isClient()) {
        this.escrowService.getByTask(code).subscribe(e => this.escrow.set(e));
      }
    });
  }

  submitProposal() {
    if (this.proposalForm.invalid || !this.task()) return;
    this.taskService.submitProposal(this.task()!.publicTaskCode, this.proposalForm.value as any)
      .subscribe((proposal) => {
        this.proposalForm.reset();
        const task = this.task();
        if (task) {
          this.task.set({
            ...task,
            hasSubmittedProposal: true,
            proposalCount: task.proposalCount + 1
          });
        }
        this.proposals.set([...this.proposals(), proposal]);
      });
  }

  showProposalForm() {
    const task = this.task();
    const status = Number(task?.status);
    return this.auth.isFreelancer()
      && !task?.hasSubmittedProposal
      && (status === 0 || status === 1);
  }

  award(proposalId: string) {
    this.taskService.awardProposal(this.task()!.publicTaskCode, proposalId)
      .subscribe(() => window.location.reload());
  }

  releaseEscrow() {
    if (this.escrow()) this.escrowService.release(this.escrow()!.escrowId).subscribe();
  }

  disputeEscrow() {
    if (this.escrow()) this.escrowService.dispute(this.escrow()!.escrowId).subscribe();
  }

  statusLabel(s: number) { return ['Open', 'Bidding', 'Active', 'Completed', 'Disputed'][s] ?? 'Open'; }
}