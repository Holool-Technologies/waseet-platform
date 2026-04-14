import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="min-h-screen flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-md">
        <div class="card p-8">
          <div class="text-center mb-8">
            <div class="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span class="text-white font-bold text-2xl">و</span>
            </div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ 'auth.register' | translate }}</h1>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{{ 'auth.email' | translate }}</label>
              <input formControlName="email" type="email" class="input-field" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{{ 'auth.password' | translate }}</label>
              <input formControlName="password" type="password" class="input-field" />
            </div>

            <div>
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role</p>
              <div class="grid grid-cols-2 gap-3">
                <button type="button"
                  (click)="form.patchValue({role: 1})"
                  [class]="form.value.role === 1
                    ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-xl p-3 text-sm font-medium transition-all'
                    : 'border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-primary-400 transition-all'">
                  {{ 'auth.asClient' | translate }}
                </button>
                <button type="button"
                  (click)="form.patchValue({role: 2})"
                  [class]="form.value.role === 2
                    ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-xl p-3 text-sm font-medium transition-all'
                    : 'border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-primary-400 transition-all'">
                  {{ 'auth.asFreelancer' | translate }}
                </button>
              </div>
            </div>

            @if (error()) {
              <div class="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl">{{ error() }}</div>
            }

            <button type="submit" class="btn-primary w-full" [disabled]="loading() || form.invalid">
              @if (loading()) { <span>...</span> } @else { {{ 'auth.register' | translate }} }
            </button>
          </form>

          <p class="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {{ 'auth.hasAccount' | translate }}
            <a routerLink="/auth/login" class="text-primary-500 font-medium hover:underline ms-1">{{ 'auth.login' | translate }}</a>
          </p>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  loading = signal(false);
  error = signal('');

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: [1, Validators.required]
  });

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.auth.register(this.form.value as any).subscribe({
      next: () => this.router.navigate(['/kyc']),
      error: () => { this.error.set('Registration failed'); this.loading.set(false); }
    });
  }
}