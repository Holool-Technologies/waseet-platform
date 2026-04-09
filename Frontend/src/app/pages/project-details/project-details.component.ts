import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';

interface Proposal {
  id: number;
  freelancerName: string;
  price: number;
  duration: string;
  rating: number;
  completedProjects: number;
  description: string;
}

@Component({
  selector: 'app-project-details',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule,
    MatIconModule, MatChipsModule, MatDividerModule
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
          <h1 style="margin:0; font-size:2rem; font-weight:600;">تطوير تطبيق موبايل</h1>
          <p style="margin:8px 0 0; opacity:0.9;">استعراض العروض المقدمة من المستقلين</p>
        </div>
      </div>

      <div class="container">

        <!-- Project Summary -->
        <mat-card style="box-shadow:0 1px 3px rgba(0,0,0,0.08)!important; margin-bottom:24px;">
          <mat-card-content style="padding:24px;">
            <h3 style="margin:0 0 12px; color:#1a237e; font-size:1.125rem; font-weight:500;">تفاصيل المشروع</h3>
            <p style="color:#757575; margin:0 0 16px; line-height:1.6;">
              نحتاج إلى مطور محترف لبناء تطبيق iOS و Android
            </p>
            <div style="display:flex; gap:24px; flex-wrap:wrap;">
              <span style="font-size:0.875rem;">الميزانية: <strong style="color:#1a237e;">5000 ريال</strong></span>
              <span style="font-size:0.875rem; color:#1a237e;">العروض المستلمة: <strong>{{ proposals.length }}</strong></span>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Proposals Header -->
        <h2 style="margin:0 0 24px; color:#1a237e; font-size:1.5rem; font-weight:600;">
          العروض المقدمة ({{ proposals.length }})
        </h2>

        <!-- Proposals List -->
        <div style="display:flex; flex-direction:column; gap:24px; margin-bottom:48px;">
          <mat-card *ngFor="let proposal of proposals" style="box-shadow:0 1px 3px rgba(0,0,0,0.08)!important;">
            <mat-card-content style="padding:24px;">

              <!-- Top Row -->
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
                <div>
                  <h3 style="margin:0 0 8px; color:#1a237e; font-size:1.125rem; font-weight:500;">
                    {{ proposal.freelancerName }}
                  </h3>
                  <div style="display:flex; align-items:center; gap:8px;">
                    <!-- Star Rating -->
                    <div style="display:flex; gap:2px;">
                      <mat-icon *ngFor="let s of getStars(proposal.rating)"
                        style="font-size:16px; width:16px; height:16px; color:#FFB400;">star</mat-icon>
                    </div>
                    <span style="color:#757575; font-size:0.8rem;">
                      {{ proposal.rating }} • {{ proposal.completedProjects }} مشروع منجز
                    </span>
                  </div>
                </div>
                <mat-chip style="background:#f5f5f5; color:#757575; font-size:0.75rem; height:24px;">مجهول</mat-chip>
              </div>

              <mat-divider style="margin-bottom:16px;"></mat-divider>

              <p style="margin:0 0 24px; line-height:1.6;">{{ proposal.description }}</p>

              <!-- Stats Grid -->
              <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:16px; margin-bottom:24px;">
                <div style="background:#f5f5f5; border-radius:8px; padding:16px; text-align:center;">
                  <p style="margin:0 0 4px; color:#757575; font-size:0.8rem;">السعر المقترح</p>
                  <p style="margin:0; color:#1a237e; font-weight:600; font-size:1.125rem;">{{ proposal.price }} ريال</p>
                </div>
                <div style="background:#f5f5f5; border-radius:8px; padding:16px; text-align:center;">
                  <p style="margin:0 0 4px; color:#757575; font-size:0.8rem;">مدة التنفيذ</p>
                  <p style="margin:0; color:#1a237e; font-weight:600; font-size:1.125rem;">{{ proposal.duration }}</p>
                </div>
                <div style="background:#f5f5f5; border-radius:8px; padding:16px; text-align:center;">
                  <p style="margin:0 0 4px; color:#757575; font-size:0.8rem;">التقييم</p>
                  <div style="display:flex; align-items:center; justify-content:center; gap:4px;">
                    <mat-icon style="color:#FFB400; font-size:20px; width:20px; height:20px;">star</mat-icon>
                    <p style="margin:0; color:#1a237e; font-weight:600; font-size:1.125rem;">{{ proposal.rating }}</p>
                  </div>
                </div>
              </div>

              <button mat-raised-button color="primary" style="width:100%; height:44px;"
                (click)="router.navigate(['/chat', proposal.id])">
                <mat-icon>chat</mat-icon>
                بدء محادثة
              </button>

            </mat-card-content>
          </mat-card>
        </div>

      </div>
    </div>
  `
})
export class ProjectDetailsComponent {
  proposals: Proposal[] = [
    { id: 1, freelancerName: 'مستقل ١', price: 4500, duration: '30 يوم', rating: 4.8, completedProjects: 45, description: 'لدي خبرة واسعة في تطوير التطبيقات المشابهة وسأقوم بتنفيذ المشروع بجودة عالية' },
    { id: 2, freelancerName: 'مستقل ٢', price: 3800, duration: '25 يوم', rating: 4.9, completedProjects: 78, description: 'أستطيع البدء فوراً والتسليم قبل الموعد المحدد مع ضمان الجودة' },
    { id: 3, freelancerName: 'مستقل ٣', price: 5200, duration: '35 يوم', rating: 4.7, completedProjects: 32, description: 'سأقدم حلاً متكاملاً مع دعم فني لمدة شهرين بعد التسليم' },
    { id: 4, freelancerName: 'مستقل ٤', price: 4000, duration: '28 يوم', rating: 4.6, completedProjects: 56, description: 'خبرة 7 سنوات في المجال، سأقدم عملاً احترافياً يلبي توقعاتك' },
  ];

  constructor(public router: Router, private route: ActivatedRoute) {}

  getStars(rating: number): number[] {
    return Array(Math.round(rating)).fill(0);
  }
}
