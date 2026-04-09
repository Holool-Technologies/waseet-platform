import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

interface Project {
  id: number;
  title: string;
  description: string;
  budget: number;
  proposals: number;
  category: string;
}

@Component({
  selector: 'app-browse-projects',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatInputModule, MatFormFieldModule
  ],
  template: `
    <div class="page-wrapper">

      <!-- Header -->
      <div class="page-header">
        <div class="container">
          <h1 style="margin:0; font-size:2rem; font-weight:600;">تصفح المشاريع</h1>
          <p style="margin:8px 0 0; opacity:0.9;">اعثر على المشاريع المناسبة لمهاراتك</p>
        </div>
      </div>

      <div class="container">

        <!-- Search Bar -->
        <mat-card style="box-shadow:0 1px 3px rgba(0,0,0,0.08)!important; margin-bottom:32px;">
          <mat-card-content style="padding:16px;">
            <mat-form-field appearance="outline" style="width:100%; margin:0;">
              <mat-label>ابحث عن مشاريع...</mat-label>
              <input matInput [(ngModel)]="searchQuery" (ngModelChange)="onSearch()">
              <mat-icon matPrefix style="margin-left:8px;">search</mat-icon>
            </mat-form-field>
          </mat-card-content>
        </mat-card>

        <h2 style="margin:0 0 24px; color:#1a237e; font-size:1.5rem; font-weight:600;">
          {{ filteredProjects.length }} مشروع متاح
        </h2>

        <!-- Projects List -->
        <div style="display:flex; flex-direction:column; gap:16px; margin-bottom:48px;">
          <mat-card *ngFor="let project of filteredProjects"
            class="hover-card"
            style="box-shadow:0 1px 3px rgba(0,0,0,0.08)!important;"
            (click)="router.navigate(['/freelancer/submit-proposal', project.id])">
            <mat-card-content style="padding:24px;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                <div style="flex:1;">
                  <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px; flex-wrap:wrap;">
                    <h3 style="margin:0; color:#1a237e; font-size:1.125rem; font-weight:500;">{{ project.title }}</h3>
                    <mat-chip
                      style="background:#e8eaf6; color:#3f51b5; font-size:0.75rem; height:24px;">
                      {{ project.category }}
                    </mat-chip>
                  </div>
                  <p style="color:#757575; font-size:0.875rem; margin:0 0 16px; line-height:1.6;">
                    {{ project.description }}
                  </p>
                </div>
              </div>
              <div style="display:flex; gap:24px; flex-wrap:wrap; align-items:center;">
                <div style="display:flex; align-items:center; gap:4px;">
                  <span style="color:#757575; font-size:0.875rem;">الميزانية:</span>
                  <strong style="color:#1a237e; font-size:1rem;">{{ project.budget }} ريال</strong>
                </div>
                <div style="display:flex; align-items:center; gap:4px;">
                  <mat-icon style="font-size:18px; width:18px; height:18px; color:#9e9e9e;">work_outline</mat-icon>
                  <span style="color:#757575; font-size:0.875rem;">{{ project.proposals }} عرض مقدم</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

      </div>
    </div>
  `
})
export class BrowseProjectsComponent {
  searchQuery = '';

  allProjects: Project[] = [
    { id: 1, title: 'تطوير تطبيق موبايل', description: 'نحتاج إلى مطور محترف لبناء تطبيق iOS و Android للتجارة الإلكترونية', budget: 5000, proposals: 7, category: 'برمجة' },
    { id: 2, title: 'تصميم هوية بصرية', description: 'تصميم شعار وهوية بصرية كاملة لشركة ناشئة', budget: 2000, proposals: 12, category: 'تصميم' },
    { id: 3, title: 'كتابة محتوى تسويقي', description: 'كتابة 20 مقالة تسويقية باللغة العربية', budget: 1500, proposals: 5, category: 'كتابة' },
    { id: 4, title: 'تطوير موقع إلكتروني', description: 'بناء موقع شركة احترافي باستخدام React', budget: 3500, proposals: 9, category: 'برمجة' },
    { id: 5, title: 'إدارة حسابات التواصل', description: 'إدارة حسابات السوشيال ميديا', budget: 2500, proposals: 15, category: 'تسويق' },
    { id: 6, title: 'برمجة بوت ذكاء اصطناعي', description: 'تطوير بوت محادثة ذكي', budget: 4000, proposals: 4, category: 'برمجة' },
    { id: 7, title: 'ترجمة وثائق تقنية', description: 'ترجمة مستندات تقنية من الإنجليزية للعربية', budget: 800, proposals: 8, category: 'ترجمة' },
    { id: 8, title: 'تحليل بيانات مالية', description: 'تحليل البيانات المالية وإعداد تقارير', budget: 3000, proposals: 6, category: 'تحليل' },
  ];

  filteredProjects: Project[] = [...this.allProjects];

  constructor(public router: Router) {}

  onSearch() {
    const q = this.searchQuery.trim().toLowerCase();
    this.filteredProjects = q
      ? this.allProjects.filter(p =>
          p.title.includes(q) || p.description.includes(q) || p.category.includes(q)
        )
      : [...this.allProjects];
  }
}
