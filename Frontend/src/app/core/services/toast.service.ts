import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);

  show(type: ToastType, title: string, message?: string, duration = 4000) {
    const id = crypto.randomUUID();
    this.toasts.update(t => [...t, { id, type, title, message, duration }]);
    setTimeout(() => this.dismiss(id), duration);
  }

  success(title: string, message?: string) { this.show('success', title, message); }
  error(title: string, message?: string)   { this.show('error',   title, message); }
  warning(title: string, message?: string) { this.show('warning', title, message); }
  info(title: string, message?: string)    { this.show('info',    title, message); }

  dismiss(id: string) {
    this.toasts.update(t => t.filter(x => x.id !== id));
  }
}