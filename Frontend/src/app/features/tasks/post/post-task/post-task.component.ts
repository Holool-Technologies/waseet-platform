import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TaskService } from '../../../../core/services/task.service';

@Component({
  selector: 'app-post-task',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  template: `
    <div class="max-w-2xl mx-auto px-4 py-10">
      <div class="card p-8">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-8">{{ 'task.post' | translate }}</h1>
        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-5">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{{ 'task.title' | translate }}</label>
            <input formControlName="title" class="input-field" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{{ 'task.description' | translate }}</label>
            <textarea formControlName="description" rows="5" class="input-field resize-none"></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{{ 'task.budget' | translate }}</label>
            <input formControlName="budgetUSD" type="number" min="1" class="input-field" />
          </div>
          @if (error()) {
            <div class="bg-red-50 dark:bg-red-900/20 text-red-600 text-sm px-4 py-3 rounded-xl">{{ error() }}</div>
          }
          <button type="submit" class="btn-primary w-full" [disabled]="loading() || form.invalid">
            @if (loading()) { <span>...</span> } @else { {{ 'task.post' | translate }} }
          </button>
        </form>
      </div>
    </div>
  `
})
export class PostTaskComponent {
  private fb = inject(FormBuilder);
  private taskService = inject(TaskService);
  private router = inject(Router);
  loading = signal(false);
  error = signal('');

  form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(5)]],
    description: ['', [Validators.required, Validators.minLength(20)]],
    budgetUSD: [null, [Validators.required, Validators.min(1)]]
  });

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.taskService.create(this.form.value as any).subscribe({
      next: task => this.router.navigate(['/tasks', task.publicTaskCode]),
      error: () => { this.error.set('Failed to post task'); this.loading.set(false); }
    });
  }
}