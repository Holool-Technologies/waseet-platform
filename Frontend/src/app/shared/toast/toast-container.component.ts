import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../core/services/toast.service';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  animations: [
    trigger('toast', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(100%)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'translateX(100%)' }))
      ])
    ])
  ],
  template: `
    <div class="fixed bottom-4 end-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      @for (toast of toastService.toasts(); track toast.id) {
        <div @toast [class]="getClass(toast)"
          class="pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-soft border animate-slide-up">
          <span class="text-lg flex-shrink-0">{{ getIcon(toast.type) }}</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold">{{ toast.title }}</p>
            @if (toast.message) {
              <p class="text-xs mt-0.5 opacity-80">{{ toast.message }}</p>
            }
          </div>
          <button (click)="toastService.dismiss(toast.id)"
            class="text-current opacity-50 hover:opacity-100 transition-opacity flex-shrink-0 text-lg leading-none">
            ×
          </button>
        </div>
      }
    </div>
  `
})
export class ToastContainerComponent {
  toastService = inject(ToastService);

  getClass(t: Toast): string {
    const map = {
      success: 'bg-success-50 dark:bg-success-700/20 border-success-200 dark:border-success-700/50 text-success-800 dark:text-success-300',
      error:   'bg-danger-50  dark:bg-danger-700/20  border-danger-200  dark:border-danger-700/50  text-danger-800  dark:text-danger-300',
      warning: 'bg-warning-50 dark:bg-warning-700/20 border-warning-200 dark:border-warning-700/50 text-warning-800 dark:text-warning-300',
      info:    'bg-brand-50   dark:bg-brand-700/20   border-brand-200   dark:border-brand-700/50   text-brand-800   dark:text-brand-300',
    };
    return map[t.type];
  }

  getIcon(type: Toast['type']): string {
    return { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' }[type];
  }
}