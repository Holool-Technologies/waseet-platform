import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-kyc',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  template: `
    <div class="max-w-lg mx-auto px-4 py-12">
      <div class="card p-8">
        <div class="text-center mb-8">
          <div class="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span class="text-2xl">🪪</span>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ 'kyc.title' | translate }}</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">{{ 'auth.kycRequired' | translate }}</p>
        </div>

        @if (submitted()) {
          <div class="text-center py-8">
            <div class="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span class="text-3xl">✓</span>
            </div>
            <p class="font-medium text-gray-900 dark:text-white">{{ 'kyc.pending' | translate }}</p>
            <p class="text-sm text-gray-500 mt-2">We'll notify you once verified.</p>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-5">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{{ 'kyc.fullName' | translate }}</label>
              <input formControlName="fullName" class="input-field" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{{ 'kyc.uploadDoc' | translate }}</label>
              <div class="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:border-primary-400 transition-colors"
                   (click)="fileInput.click()">
                <input #fileInput type="file" class="hidden" accept=".jpg,.jpeg,.png,.pdf" (change)="onFile($event)" />
                @if (fileName()) {
                  <p class="text-sm text-primary-500 font-medium">{{ fileName() }}</p>
                } @else {
                  <p class="text-sm text-gray-400">Click to upload JPG, PNG or PDF</p>
                }
              </div>
            </div>
            @if (error()) {
              <div class="bg-red-50 dark:bg-red-900/20 text-red-600 text-sm px-4 py-3 rounded-xl">{{ error() }}</div>
            }
            <button type="submit" class="btn-primary w-full" [disabled]="loading() || form.invalid || !file()">
              @if (loading()) { <span>...</span> } @else { {{ 'kyc.submit' | translate }} }
            </button>
          </form>
        }
      </div>
    </div>
  `
})
export class KycComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);

  loading = signal(false);
  error = signal('');
  submitted = signal(false);
  file = signal<File | null>(null);
  fileName = signal('');

  form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]]
  });

  onFile(event: Event) {
    const f = (event.target as HTMLInputElement).files?.[0];
    if (f) { this.file.set(f); this.fileName.set(f.name); }
  }

  submit() {
    if (this.form.invalid || !this.file()) return;
    this.loading.set(true);
    const fd = new FormData();
    fd.append('fullName', this.form.value.fullName!);
    fd.append('document', this.file()!);
    this.http.post(`${environment.apiUrl}/kyc/submit`, fd).subscribe({
      next: () => { this.submitted.set(true); this.loading.set(false); },
      error: () => { this.error.set('Submission failed'); this.loading.set(false); }
    });
  }
}