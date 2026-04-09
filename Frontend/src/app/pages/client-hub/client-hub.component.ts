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
  status: string;
}

@Component({
  selector: 'app-client-hub',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatChipsModule, StatsCardComponent],
  template: `
    <div class="page-wrapper">

      <!-- Header -->
      <div class="page-header">
        <div class="container">
          <h1 style="margin:0; font-size:2rem; font-weight:600;">لوحة العميل</h1>
          <p style="margin:8px 0 0; opacity:0.9;">إدارة مشاريعك والتواصل مع المستقلين</p>
        </div>
      </div>

      <div class="container">

        <!-- Stats Row -->
        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:24px; margin-bottom:32px;">
          <app-stats-card title="مشاريع نشطة" value="3" icon="assignment" color="#1a237e" />
          <app-stats-card title="قيد المراجعة" value="1" icon="pending_actions" color="#f57c00" />
          <app-stats-card title="مشاريع منجزة" value="12" icon="check_circle" color="#388e3c" />
        </div>

        <!-- Projects Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
          <h2 style="margin:0; color:#1a237e; font-size:1.5rem; font-weight:600;">مشاريعي</h2>
          <button mat-raised-button color="primary" (click)="router.navigate(['/client/add-project'])">
            <mat-icon>add</mat-icon>
            إضافة مشروع جديد
          </button>
        </div>

        <!-- Projects Grid -->
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(340px, 1fr)); gap:24px; margin-bottom:48px;">
          <mat-card *ngFor="let project of projects" style="display:flex; flex-direction:column; box-shadow:0 1px 3px rgba(0,0,0,0.08)!important;">
            <mat-card-content style="flex:1; padding:24px;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                <h3 style="margin:0; color:#1a237e; font-size:1.125rem; font-weight:500;">{{ project.title }}</h3>
                <mat-chip
                  [style.background]="project.status === 'مفتوح' ? '#e8f5e9' : '#f5f5f5'"
                  [style.color]="project.status === 'مفتوح' ? '#388e3c' : '#757575'"
                  style="height:24px; font-size:0.75rem;">
                  {{ project.status }}
                </mat-chip>
              </div>
              <p style="color:#757575; font-size:0.875rem; margin:0 0 16px; line-height:1.6;">
                {{ project.description }}
              </p>
              <div style="display:flex; gap:24px; flex-wrap:wrap;">
                <span style="font-size:0.875rem;">الميزانية: <strong style="color:#1a237e;">{{ project.budget }} ريال</strong></span>
                <span style="font-size:0.875rem; color:#1a237e;">العروض: <strong>{{ project.proposals }}</strong></span>
              </div>
            </mat-card-content>
            <mat-card-actions style="padding:0 24px 16px;">
              <button mat-stroked-button color="primary" style="width:100%;" (click)="router.navigate(['/client/project', project.id])">
                <mat-icon>visibility</mat-icon>
                عرض العروض المقدمة
              </button>
            </mat-card-actions>
          </mat-card>
        </div>

      </div>
    </div>
  `
})
export class ClientHubComponent {
  projects: Project[] = [
    { id: 1, title: 'تطوير تطبيق موبايل', description: 'نحتاج إلى مطور محترف لبناء تطبيق iOS و Android', budget: 5000, proposals: 7, status: 'مفتوح' },
    { id: 2, title: 'تصميم هوية بصرية', description: 'تصميم شعار وهوية بصرية كاملة لشركة ناشئة', budget: 2000, proposals: 12, status: 'مفتوح' },
    { id: 3, title: 'كتابة محتوى تسويقي', description: 'كتابة 20 مقالة تسويقية باللغة العربية', budget: 1500, proposals: 5, status: 'قيد المراجعة' },
  ];

  constructor(public router: Router) {}
}
