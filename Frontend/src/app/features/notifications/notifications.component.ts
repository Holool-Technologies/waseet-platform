import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NotificationService } from '../../core/services/notification.service';
import { LangService } from '../../core/services/lang.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div class="page-sm">
      <div class="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 class="section-title">Notifications</h1>
          <p class="section-sub">Stay updated on your activity</p>
        </div>
        @if (notifService.unreadCount() > 0) {
          <button (click)="notifService.markAllRead()" class="btn-secondary btn-sm">
            Mark all read
          </button>
        }
      </div>

      @if (notifService.notifications().length === 0) {
        <div class="card p-12 text-center">
          <p class="text-4xl mb-4">🔔</p>
          <p class="font-medium text-neutral-700 dark:text-neutral-300">No notifications yet</p>
          <p class="text-sm text-neutral-400 mt-1">You'll be notified about KYC, tasks, and more</p>
        </div>
      } @else {
        <div class="card overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800">
          @for (n of notifService.notifications(); track n.notificationId) {
            <div (click)="onNotifClick(n)"
              [class]="n.isRead
                ? 'flex items-start gap-3 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors'
                : 'flex items-start gap-3 p-4 bg-brand-50 dark:bg-brand-900/10 hover:bg-brand-100/50 dark:hover:bg-brand-900/20 cursor-pointer transition-colors'">

              <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                [class]="getIconBg(n.type)">
                {{ getIcon(n.type) }}
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <p class="text-sm font-semibold text-neutral-900 dark:text-white">{{ n.title }}</p>
                  @if (!n.isRead) {
                    <div class="w-2 h-2 bg-brand-500 rounded-full flex-shrink-0 mt-1.5"></div>
                  }
                </div>
                <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">{{ n.body }}</p>
                <p class="text-[10px] text-neutral-400 mt-1.5">{{ n.createdAt | date:'d MMM yyyy, HH:mm' }}</p>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class NotificationsComponent implements OnInit {
  notifService = inject(NotificationService);
  private lang = inject(LangService);

  ngOnInit() {
    this.notifService.load(this.lang.isArabic() ? 'ar' : 'en', 1, 50);
  }

  onNotifClick(n: any) {
    if (!n.isRead) this.notifService.markRead(n.notificationId);
    if (n.relatedUrl) window.location.href = n.relatedUrl;
  }

  getIcon(type: string): string {
    const map: Record<string, string> = {
      KycApproved: '✓', KycRejected: '✕',
      TaskApproved: '📋', TaskRejected: '📋',
      ProposalAwarded: '🏆', NewMessage: '💬',
      PortfolioApproved: '🖼', PortfolioRejected: '🖼',
      NewProposal: '📩'
    };
    return map[type] ?? '🔔';
  }

  getIconBg(type: string): string {
    const map: Record<string, string> = {
      KycApproved:      'bg-success-50 dark:bg-success-900/20 text-success-600',
      KycRejected:      'bg-danger-50  dark:bg-danger-900/20  text-danger-600',
      TaskApproved:     'bg-brand-50   dark:bg-brand-900/20   text-brand-600',
      TaskRejected:     'bg-danger-50  dark:bg-danger-900/20  text-danger-600',
      ProposalAwarded:  'bg-warning-50 dark:bg-warning-900/20 text-warning-600',
      PortfolioApproved:'bg-success-50 dark:bg-success-900/20 text-success-600',
      PortfolioRejected:'bg-danger-50  dark:bg-danger-900/20  text-danger-600',
      NewMessage:       'bg-brand-50   dark:bg-brand-900/20   text-brand-600',
    };
    return map[type] ?? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500';
  }
}