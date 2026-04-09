import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-submit-proposal',
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
          <button mat-button style="color:white; margin-bottom:12px;" (click)="router.navigate(['/freelancer'])">
            <mat-icon>arrow_back</mat-icon>
            رجوع
          </button>
          <h1 style="margin:0; font-size:2rem; font-weight:600;">تقديم عرض</h1>
          <p style="margin:8px 0 0; opacity:0.9;">قدم عرضك المهني للمشروع</p>
        </div>
      </div>

      <div class="container-md">

        <!-- Project Summary -->
        <div class="info-banner" style="margin-bottom:24px;">
          <h3 style="margin:0 0 8px; color:#1a237e; font-size:1.125rem; font-weight:500;">تطوير تطبيق موبايل</h3>
          <p style="color:#757575; font-size:0.875rem; margin:0 0 12px; line-height:1.6;">
            نحتاج إلى مطور محترف لبناء تطبيق iOS و Android للتجارة الإلكترونية
          </p>
          <span style="font-size:0.875rem;">الميزانية المقترحة: <strong style="color:#1a237e;">5000 ريال</strong></span>
        </div>

        <mat-card style="box-shadow:0 1px 3px rgba(0,0,0,0.08)!important; margin-bottom:24px;">
          <mat-card-content style="padding:32px;">

            <!-- Anonymity notice -->
            <div style="background:#e3f2fd; border-radius:8px; padding:12px 16px; display:flex; align-items:center; gap:12px; margin-bottom:24px;">
              <mat-icon style="color:#1a237e;">info</mat-icon>
              <span style="color:#1a237e; font-size:0.875rem;">سيتم إخفاء هويتك الحقيقية وستظهر كـ "مستقل" مجهول</span>
            </div>

            <mat-form-field appearance="outline" style="width:100%; margin-bottom:8px;">
              <mat-label>السعر المقترح</mat-label>
              <input matInput type="number" [(ngModel)]="price" required>
              <span matSuffix style="padding-left:8px;">ريال</span>
            </mat-form-field>

            <mat-form-field appearance="outline" style="width:100%; margin-bottom:8px;">
              <mat-label>مدة التنفيذ</mat-label>
              <input matInput [(ngModel)]="duration" required placeholder="مثال: 30 يوم">
            </mat-form-field>

            <mat-form-field appearance="outline" style="width:100%; margin-bottom:24px;">
              <mat-label>وصف العرض</mat-label>
              <textarea matInput [(ngModel)]="description" rows="6" required
                placeholder="اشرح كيف ستنفذ المشروع وما يميز عرضك..."></textarea>
            </mat-form-field>

            <!-- File Upload -->
            <button mat-stroked-button color="primary" style="margin-bottom:32px;" (click)="fileInput.click()">
              <mat-icon>attach_file</mat-icon>
              رفع أعمال سابقة (مجهولة المصدر)
            </button>
            <input #fileInput type="file" hidden multiple>

            <div style="display:flex; gap:16px;">
              <button mat-raised-button color="primary" style="flex:1; height:48px; font-size:1rem;" (click)="handleSubmit()">
                <mat-icon>send</mat-icon>
                إرسال العرض
              </button>
              <button mat-stroked-button color="primary" style="min-width:120px; height:48px;" (click)="router.navigate(['/freelancer'])">
                إلغاء
              </button>
            </div>

          </mat-card-content>
        </mat-card>

        <!-- Tip Banner -->
        <div class="info-banner">
          <p style="margin:0; color:#757575; font-size:0.875rem;">
            💡 نصيحة: قدم عرضاً تنافسياً واشرح خبرتك بوضوح للحصول على فرصة أفضل
          </p>
        </div>

      </div>
    </div>
  `
})
export class SubmitProposalComponent {
  price = '';
  duration = '';
  description = '';

  constructor(public router: Router, private route: ActivatedRoute) {}

  handleSubmit() {
    this.router.navigate(['/freelancer']);
  }
}
