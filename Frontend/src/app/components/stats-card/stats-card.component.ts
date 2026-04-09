import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-stats-card',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  template: `
    <mat-card class="stats-card">
      <mat-card-content style="text-align: center; padding: 24px;">
        <div
          *ngIf="icon"
          class="stats-icon-wrapper"
          [style.backgroundColor]="color + '20'"
          [style.color]="color"
        >
          <mat-icon>{{ icon }}</mat-icon>
        </div>
        <h2 [style.color]="color" style="margin: 0 0 8px; font-size: 1.75rem; font-weight: 600;">
          {{ value }}
        </h2>
        <p style="margin: 0; color: #757575; font-size: 0.875rem;">{{ title }}</p>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .stats-card {
      height: 100%;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08) !important;
    }
    .stats-icon-wrapper {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      margin-bottom: 16px;
    }
  `]
})
export class StatsCardComponent {
  @Input() title = '';
  @Input() value: string | number = '';
  @Input() icon = '';
  @Input() color = '#1a237e';
}
