import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';

interface PendingItem {
  itemId: string; profileId: string; userId: string;
  imageUrl: string; caption: string; humanDetected: boolean; uploadedAt: string;
}

@Component({
  selector: 'app-admin-portfolio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-5">
      <div class="flex items-center justify-between">
        <h1 class="section-title">Portfolio Review</h1>
        <span class="badge-amber">{{ items().length }} pending</span>
      </div>

      @if (loading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (i of [1,2,3]; track i) {
            <div class="card animate-pulse"><div class="aspect-video skeleton rounded-t-2xl"></div><div class="p-4 space-y-2"><div class="h-3 skeleton rounded w-2/3"></div></div></div>
          }
        </div>
      } @else if (items().length === 0) {
        <div class="card p-12 text-center">
          <p class="text-4xl mb-3">✓</p>
          <p class="font-medium text-neutral-700 dark:text-neutral-300">All portfolios reviewed!</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (item of items(); track item.itemId) {
            <div class="card overflow-hidden">
              <div class="relative aspect-video bg-neutral-100 dark:bg-neutral-800">
                <img [src]="item.imageUrl" [alt]="item.caption"
                  class="w-full h-full object-cover" />
                @if (item.humanDetected) {
                  <div class="absolute inset-0 bg-danger-500/20 flex items-center justify-center">
                    <span class="badge-red text-sm">⚠ Human detected</span>
                  </div>
                }
              </div>
              <div class="p-4 space-y-3">
                @if (item.caption) {
                  <p class="text-sm text-neutral-600 dark:text-neutral-400">{{ item.caption }}</p>
                }
                <p class="text-xs text-neutral-400">Uploaded {{ item.uploadedAt | date:'d MMM yyyy' }}</p>

                <div>
                  <label class="input-label text-xs">Admin notes</label>
                  <input [(ngModel)]="notes[item.itemId]" class="input text-sm py-2"
                    placeholder="Reason for rejection (required if rejecting)" />
                </div>

                <div class="flex gap-2">
                  <button (click)="decide(item, 'approve')" [disabled]="deciding[item.itemId]"
                    class="btn-primary btn-sm flex-1">
                    ✓ Approve
                  </button>
                  <button (click)="decide(item, 'reject')" [disabled]="deciding[item.itemId]"
                    class="btn-danger btn-sm flex-1">
                    ✕ Reject
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class AdminPortfolioComponent implements OnInit {
  private http  = inject(HttpClient);
  private toast = inject(ToastService);

  items   = signal<PendingItem[]>([]);
  loading = signal(true);
  notes: Record<string, string>   = {};
  deciding: Record<string, boolean> = {};

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.http.get<PendingItem[]>(`${environment.apiUrl}/profile/admin/portfolio/pending`).subscribe({
      next: i => { this.items.set(i); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  decide(item: PendingItem, decision: 'approve' | 'reject') {
    if (decision === 'reject' && !this.notes[item.itemId]?.trim()) {
      this.toast.warning('Note required', 'Please provide a rejection reason.');
      return;
    }
    this.deciding[item.itemId] = true;
    this.http.patch(
      `${environment.apiUrl}/profile/admin/portfolio/${item.itemId}/review`,
      { decision, adminNotes: this.notes[item.itemId] ?? '' }
    ).subscribe({
      next: () => {
        this.toast.success(`Image ${decision}d`);
        this.items.update(i => i.filter(x => x.itemId !== item.itemId));
        this.deciding[item.itemId] = false;
      },
      error: () => {
        this.toast.error('Failed');
        this.deciding[item.itemId] = false;
      }
    });
  }
}