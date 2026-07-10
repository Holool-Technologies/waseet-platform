import {
  Component, inject, signal,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

export interface ConfirmModalOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        (click)="cancel()">

        <!-- Modal -->
        <div
          class="card max-w-md w-full p-6 animate-slide-up shadow-2xl"
          (click)="$event.stopPropagation()">

          <!-- Icon -->
          <div class="flex items-center justify-center w-12 h-12 rounded-2xl mb-4 mx-auto"
            [class]="opts().danger
              ? 'bg-danger-50 dark:bg-danger-900/20'
              : 'bg-brand-50 dark:bg-brand-900/20'">
            @if (opts().danger) {
              <svg class="w-6 h-6 text-danger-500" fill="none"
                stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82
                     18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71
                     3.86a2 2 0 00-3.42 0z"/>
              </svg>
            } @else {
              <svg class="w-6 h-6 text-brand-500" fill="none"
                stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round"
                  stroke-width="2"
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21
                     0 4 1.343 4 3 0 1.4-1.278 2.575-3.006
                     2.907-.542.104-.994.54-.994 1.093m0
                     3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            }
          </div>

          <h2 class="text-lg font-bold text-neutral-900 dark:text-white
                     text-center mb-2">
            {{ opts().title }}
          </h2>

          <p class="text-sm text-neutral-500 dark:text-neutral-400
                    text-center mb-6 leading-relaxed">
            {{ opts().description }}
          </p>

          <div class="flex gap-3">
            <button
              (click)="cancel()"
              [disabled]="loading()"
              class="btn-secondary flex-1">
              {{ opts().cancelLabel || ('modal.cancel' | translate) }}
            </button>
            <button
              (click)="confirm()"
              [disabled]="loading()"
              [class]="opts().danger ? 'btn-danger flex-1' : 'btn-primary flex-1'">
              @if (loading()) {
                <span class="w-4 h-4 border-2 border-white
                             border-t-transparent rounded-full
                             animate-spin inline-block me-1"></span>
              }
              {{ opts().confirmLabel || ('modal.confirm' | translate) }}
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class ConfirmModalComponent {
  visible = signal(false);
  loading = signal(false);
  opts    = signal<ConfirmModalOptions>({
    title: '',
    description: '',
    danger: false
  });

  private resolveFn?: (confirmed: boolean) => void;

  open(options: ConfirmModalOptions): Promise<boolean> {
    this.opts.set(options);
    this.visible.set(true);
    this.loading.set(false);
    return new Promise(resolve => { this.resolveFn = resolve; });
  }

  setLoading(val: boolean) { this.loading.set(val); }

  confirm() {
    this.resolveFn?.(true);
  }

  cancel() {
    this.visible.set(false);
    this.resolveFn?.(false);
  }

  close() {
    this.visible.set(false);
    this.loading.set(false);
  }
}