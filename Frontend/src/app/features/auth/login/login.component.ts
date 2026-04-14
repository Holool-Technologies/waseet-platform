import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
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
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ 'auth.login' | translate }}</h1>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {{ 'auth.email' | translate }}
              </label>
              <input formControlName="email" type="email" class="input-field"
                [placeholder]="'auth.email' | translate" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {{ 'auth.password' | translate }}
              </label>
              <input formControlName="password" type="password" class="input-field"
                [placeholder]="'auth.password' | translate" />
            </div>

            @if (error()) {
              <div class="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl">
                {{ error() }}
              </div>
            }

            <button type="submit" class="btn-primary w-full" [disabled]="loading() || form.invalid">
              @if (loading()) { <span class="opacity-70">...</span> }
              @else { {{ 'auth.login' | translate }} }
            </button>
          </form>

          <p class="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {{ 'auth.noAccount' | translate }}
            <a routerLink="/auth/register" class="text-primary-500 font-medium hover:underline ms-1">
              {{ 'auth.register' | translate }}
            </a>
          </p>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  error = signal('');

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.form.value as any).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => { this.error.set('Invalid credentials'); this.loading.set(false); }
    });
  }
}