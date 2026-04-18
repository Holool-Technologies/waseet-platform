import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50 dark:bg-gray-950">
      <div class="w-full max-w-md">
        <div class="card p-8">
          <div class="text-center mb-8">
            <div class="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span class="text-2xl">🔐</span>
            </div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Set New Password</h1>
          </div>

          @if (!token()) {
            <div class="text-center text-red-500">Invalid or missing reset token.</div>
          } @else if (done()) {
            <div class="text-center py-4">
              <div class="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span class="text-3xl">✓</span>
              </div>
              <p class="font-medium text-gray-900 dark:text-white">Password updated!</p>
              <a routerLink="/auth/login" class="btn-primary inline-block mt-6">Login now</a>
            </div>
          } @else {
            <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
                <input formControlName="password" type="password" class="input-field" placeholder="Min. 6 characters" />
                @if (form.get('password')?.invalid && form.get('password')?.touched) {
                  <p class="mt-1.5 text-xs text-red-500">Password must be at least 6 characters.</p>
                }
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm Password</label>
                <input formControlName="confirm" type="password" class="input-field" />
                @if (form.errors?.['mismatch'] && form.get('confirm')?.touched) {
                  <p class="mt-1.5 text-xs text-red-500">Passwords do not match.</p>
                }
              </div>
              @if (error()) {
                <div class="bg-red-50 dark:bg-red-900/20 text-red-600 text-sm px-4 py-3 rounded-xl">{{ error() }}</div>
              }
              <button type="submit" class="btn-primary w-full" [disabled]="loading() || form.invalid">
                @if (loading()) { Resetting... } @else { Reset Password }
              </button>
            </form>
          }
        </div>
      </div>
    </div>
  `
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  loading = signal(false);
  done = signal(false);
  error = signal('');
  token = signal('');

  form = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirm: ['', Validators.required]
  }, { validators: (g) => g.get('password')?.value === g.get('confirm')?.value ? null : { mismatch: true } });

  ngOnInit() {
    this.token.set(this.route.snapshot.queryParamMap.get('token') ?? '');
  }

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.auth.resetPassword(this.token(), this.form.value.password!).subscribe({
      next: () => { this.done.set(true); this.loading.set(false); },
      error: (err) => { this.error.set(err?.error?.message ?? 'Reset failed.'); this.loading.set(false); }
    });
  }
}