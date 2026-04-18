import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50 dark:bg-gray-950">
      <div class="w-full max-w-md">
        <div class="card p-8">
          <div class="text-center mb-8">
            <div class="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span class="text-2xl">🔑</span>
            </div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Forgot Password?</h1>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Enter your email and we'll send you a reset link.
            </p>
          </div>

          @if (sent()) {
            <div class="text-center py-4">
              <div class="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span class="text-3xl">✉</span>
              </div>
              <p class="font-medium text-gray-900 dark:text-white">Check your inbox</p>
              <p class="text-sm text-gray-500 mt-2">
                If that email exists, a reset link has been sent. Check your spam folder too.
              </p>
              <a routerLink="/auth/login" class="btn-primary inline-block mt-6">Back to login</a>
            </div>
          } @else {
            <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
                <input formControlName="email" type="email" class="input-field" placeholder="you@example.com" />
                @if (form.get('email')?.invalid && form.get('email')?.touched) {
                  <p class="mt-1.5 text-xs text-red-500">Enter a valid email.</p>
                }
              </div>
              <button type="submit" class="btn-primary w-full" [disabled]="loading() || form.invalid">
                @if (loading()) {
                  <span class="flex items-center justify-center gap-2">
                    <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Sending...
                  </span>
                } @else { Send Reset Link }
              </button>
            </form>
            <p class="mt-6 text-center text-sm">
              <a routerLink="/auth/login" class="text-primary-500 hover:underline">Back to login</a>
            </p>
          }
        </div>
      </div>
    </div>
  `
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  loading = signal(false);
  sent = signal(false);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.auth.forgotPassword(this.form.value.email!).subscribe({
      next: () => { this.sent.set(true); this.loading.set(false); },
      error: () => { this.sent.set(true); this.loading.set(false); } // always show success
    });
  }
}