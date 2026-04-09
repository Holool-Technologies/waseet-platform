import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-add-project',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatInputModule,
    MatFormFieldModule, MatIconModule
  ],
  template: `
    <div class="page-wrapper">

      <!-- Header -->
      <div class="page-header">
        <div class="container">
          <button mat-button style="color:white; margin-bottom:12px;" (click)="router.navigate(['/client'])">
            <mat-icon>arrow_back</mat-icon>
            رجوع
          </button>
          <h1 style="margin:0; font-size:2rem; font-weight:600;">إضافة مشروع جديد</h1>
          <p style="margin:8px 0 0; opacity:0.9;">قم بوصف مشروعك بدقة للحصول على أفضل العروض</p>
        </div>
      </div>

      <div class="container-md">

        <mat-card style="box-shadow:0 1px 3px rgba(0,0,0,0.08)!important; margin-bottom:24px;">
          <mat-card-content style="padding:32px;">

            <mat-form-field appearance="outline" style="width:100%; margin-bottom:8px;">
              <mat-label>عنوان المشروع</mat-label>
              <input matInput [(ngModel)]="title" required placeholder="مثال: تطوير موقع إلكتروني">
            </mat-form-field>

            <mat-form-field appearance="outline" style="width:100%; margin-bottom:8px;">
              <mat-label>الوصف المهني</mat-label>
              <textarea matInput [(ngModel)]="description" rows="6" required
                placeholder="اشرح متطلبات المشروع بالتفصيل..."></textarea>
            </mat-form-field>

            <mat-form-field appearance="outline" style="width:100%; margin-bottom:24px;">
              <mat-label>الميزانية</mat-label>
              <input matInput type="number" [(ngModel)]="budget" required>
              <span matSuffix style="padding-left:8px;">ريال</span>
            </mat-form-field>

            <div style="display:flex; gap:16px;">
              <button mat-raised-button color="primary" style="flex:1; height:48px; font-size:1rem;" (click)="handleSubmit()">
                <mat-icon>save</mat-icon>
                نشر المشروع
              </button>
              <button mat-stroked-button color="primary" style="min-width:120px; height:48px;" (click)="router.navigate(['/client'])">
                إلغاء
              </button>
            </div>

          </mat-card-content>
        </mat-card>

        <!-- Tip Banner -->
        <div class="info-banner">
          <p style="margin:0; color:#757575; font-size:0.875rem;">
            💡 نصيحة: كلما كان الوصف أكثر تفصيلاً، كانت العروض المقدمة أكثر دقة ومهنية
          </p>
        </div>

      </div>
    </div>
  `
})
export class AddProjectComponent {
  title = '';
  description = '';
  budget = '';

  constructor(public router: Router) {}

  handleSubmit() {
    this.router.navigate(['/client']);
  }
}
