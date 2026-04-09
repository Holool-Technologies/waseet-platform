import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatInputModule,
    MatFormFieldModule, MatTabsModule, MatIconModule, MatDividerModule
  ],
  template: `
    <div style="min-height:100vh; display:flex; align-items:center; justify-content:center; background:#f5f5f5;">
      <div style="width:100%; max-width:480px; padding:24px;">

        <div style="text-align:center; margin-bottom:32px;">
          <h1 style="color:#1a237e; font-size:2rem; font-weight:600; margin:0 0 8px;">وسيـــــط</h1>
          <p style="color:#757575; margin:0;">منصة العمل الحر المجهولة</p>
        </div>

        <mat-card style="box-shadow:0 1px 3px rgba(0,0,0,0.08)!important;">
          <mat-card-content style="padding:32px;">

            <!-- Info Banner -->
            <div style="background:#e3f2fd; border-radius:8px; padding:12px 16px; display:flex; align-items:center; gap:12px; margin-bottom:24px;">
              <mat-icon style="color:#1a237e;">lock</mat-icon>
              <span style="color:#1a237e; font-size:0.875rem;">بياناتك الحقيقية مشفرة ولن تظهر لأي طرف</span>
            </div>

            <mat-tab-group [(selectedIndex)]="selectedTab" style="margin-bottom:24px;">
              <mat-tab label="تسجيل الدخول"></mat-tab>
              <mat-tab label="إنشاء حساب جديد"></mat-tab>
            </mat-tab-group>

            <mat-form-field appearance="outline" style="width:100%; margin-bottom:16px;">
              <mat-label>البريد الإلكتروني</mat-label>
              <input matInput type="email" [(ngModel)]="email" required>
            </mat-form-field>

            <mat-form-field appearance="outline" style="width:100%; margin-bottom:24px;">
              <mat-label>كلمة المرور</mat-label>
              <input matInput type="password" [(ngModel)]="password" required>
            </mat-form-field>

            <button mat-raised-button color="primary" style="width:100%; height:48px; margin-bottom:16px; font-size:1rem;" (click)="handleSubmit()">
              {{ selectedTab === 0 ? 'دخول' : 'إنشاء حساب' }}
            </button>

            <mat-divider style="margin: 24px 0;"></mat-divider>
            <p style="text-align:center; color:#9e9e9e; margin: -12px 0 16px; font-size:0.875rem; background:white; display:inline-block; padding:0 16px; position:relative; right:50%; transform:translateX(50%);">أو</p>

            <div style="display:flex; gap:16px;">
              <button mat-stroked-button color="primary" style="flex:1; height:44px;" (click)="router.navigate(['/client'])">
                دخول كعميل
              </button>
              <button mat-stroked-button color="primary" style="flex:1; height:44px;" (click)="router.navigate(['/freelancer'])">
                دخول كمستقل
              </button>
            </div>

          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `
})
export class AuthComponent {
  selectedTab = 0;
  email = '';
  password = '';

  constructor(public router: Router) {}

  handleSubmit() {
    this.router.navigate(['/client']);
  }
}
