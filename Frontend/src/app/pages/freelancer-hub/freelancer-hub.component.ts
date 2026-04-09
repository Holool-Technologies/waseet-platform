import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { StatsCardComponent } from '../../components/stats-card/stats-card.component';

interface Project {
  id: number;
  title: string;
  description: string;
  budget: number;
  proposals: number;
  postedDate: string;
}

@Component({
  selector: 'app-freelancer-hub',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatChipsModule, StatsCardComponent],
  template: `
    <div class="page-wrapper">

      <!-- Header -->
      <div class="page-header">
        <div class="container">
          <h1 style="margin:0; font-size:2rem; font-weight:600;">لوحة المستقل</h1>
          <p style="margin:8px 0 0; opacity:0.9;">تصفح المشاريع المتاحة وقدم عروضك</p>
        </div>
      </div>

      <div class="container">

        <!-- Stats Row -->
        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:24px; margin-bottom:32px;">
          <app-stats-card title="عروض مقدمة" value="8" icon="send" color="#1a237e" />
          <app-stats-card title="قيد التنفيذ" value="2" icon="pending_actions" color="#f57c00" />
          <app-stats-card title="إجمالي الأرباح" value="25,400 ر.س" icon="attach_money" color="#388e3c" />
        </div>

        <!-- Projects Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
          <h2 style="margin:0; color:#1a237e; font-size:1.5rem; font-weight:600;">المشاريع المتاحة</h2>
          <button mat-raised-button color="primary" (click)="router.navigate(['/freelancer/browse'])">
            <mat-icon>work_outline</mat-icon>
            تصفح جميع المشاريع
          </button>
        </div>

        <!-- Projects Grid -->
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(340px,1fr)); gap:24px; margin-bottom:48px;">
          <mat-card *ngFor="let project of projects"
            style="display:flex; flex-direction:column; box-shadow:0 1px 3px rgba(0,0,0,0.08)!important;">
            <mat-card-content style="flex:1; padding:24px;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                <h3 style="margin:0; color:#1a237e; font-size:1.125rem; font-weight:500;">{{ project.title }}</h3>
                <mat-chip style="background:#f5f5f5; color:#757575; font-size:0.75rem; height:24px; white-space:nowrap;">
                  {{ project.postedDate }}
                </mat-chip>
              </div>
              <p style="color:#757575; font-size:0.875rem; margin:0 0 16px; line-height:1.6;">
                {{ project.description }}
              </p>
              <div style="display:flex; gap:24px; flex-wrap:wrap;">
                <span style="font-size:0.875rem;">الميزانية: <strong style="color:#1a237e;">{{ project.budget }} ريال</strong></span>
                <span style="font-size:0.875rem; color:#757575;">{{ project.proposals }} عرض مقدم</span>
              </div>
            </mat-card-content>
            <mat-card-actions style="padding:0 24px 16px;">
              <button mat-raised-button color="primary" style="width:100%;"
                (click)="router.navigate(['/freelancer/submit-proposal', project.id])">
                <mat-icon>send</mat-icon>
                تقديم عرض
              </button>
            </mat-card-actions>
          </mat-card>
        </div>

      </div>
    </div>
  `
})
export class FreelancerHubComponent {
  projects: Project[] = [
    { id: 1, title: 'تطوير تطبيق موبايل', description: 'نحتاج إلى مطور محترف لبناء تطبيق iOS و Android للتجارة الإلكترونية', budget: 5000, proposals: 7, postedDate: 'منذ يومين' },
    { id: 2, title: 'تصميم هوية بصرية', description: 'تصميم شعار وهوية بصرية كاملة لشركة ناشئة في مجال التقنية', budget: 2000, proposals: 12, postedDate: 'منذ 5 ساعات' },
    { id: 3, title: 'كتابة محتوى تسويقي', description: 'كتابة 20 مقالة تسويقية باللغة العربية لموقع إلكتروني', budget: 1500, proposals: 5, postedDate: 'منذ 3 أيام' },
    { id: 4, title: 'تطوير موقع إلكتروني', description: 'بناء موقع شركة احترافي باستخدام React و Tailwind CSS', budget: 3500, proposals: 9, postedDate: 'منذ يوم واحد' },
    { id: 5, title: 'إدارة حسابات التواصل', description: 'إدارة حسابات السوشيال ميديا لمدة شهر مع إنشاء محتوى يومي', budget: 2500, proposals: 15, postedDate: 'منذ 8 ساعات' },
    { id: 6, title: 'برمجة بوت ذكاء اصطناعي', description: 'تطوير بوت محادثة ذكي باستخدام تقنيات الذكاء الاصطناعي', budget: 4000, proposals: 4, postedDate: 'منذ 4 ساعات' },
  ];

  constructor(public router: Router) {}
}
