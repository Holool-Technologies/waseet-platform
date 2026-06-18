import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TaskService } from '../../../../core/services/task.service';
import { ToastService } from '../../../../core/services/toast.service';

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
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
            <select formControlName="category" class="input-field">
              <option [value]="0">Other</option>
              <option [value]="1">Programming & Development</option>
              <option [value]="2">Design & Creative</option>
              <option [value]="3">Writing & Translation</option>
              <option [value]="4">Marketing & Sales</option>
              <option [value]="5">Video & Animation</option>
              <option [value]="6">Music & Audio</option>
              <option [value]="7">Data Science</option>
              <option [value]="8">Business & Consulting</option>
              <option [value]="9">Admin & Support</option>
            </select>
          </div>
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
  private translate = inject(TranslateService);
  private toast = inject(ToastService);
  loading = signal(false);
  error = signal('');


  form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(5)]],
    description: ['', [Validators.required, Validators.minLength(20)]],
    budgetUSD: [null, [Validators.required, Validators.min(1)]],
    category: [0, Validators.required]   // REQ 2
  });

  submit() {
  if (this.form.invalid) return;
  this.loading.set(true);

  this.taskService.create(this.form.value as any).subscribe({
    next: (task: any) => {
      // لو وصف المهمة أو العنوان اتغير
      if (task.descriptionWasRewritten) {
        this.toast.info(
          this.translate.instant('aiRewrite.title'),
          this.translate.instant('aiRewrite.task')
        );
        // أعطِ المستخدم ثانيتين يشوف الـ toast قبل الـ navigate
        setTimeout(() => {
          this.router.navigate(['/tasks', task.publicTaskCode]);
        }, 2000);
      } else {
        this.router.navigate(['/tasks', task.publicTaskCode]);
      }
    },
    error: (err) => {
      const errorCode = err?.error?.code ?? 'SUBMIT_FAILED';
      const msg = this.translate.instant(`proposalErrors.${errorCode}`);
      this.toast.error(
        this.translate.instant('task.postError') ?? 'Error',
        msg
      );
      this.loading.set(false);
    }
  });
}
}