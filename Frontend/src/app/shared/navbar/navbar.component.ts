import { Component, inject, signal, HostListener, OnInit, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ThemeService } from '../../core/services/theme.service';
import { LangService } from '../../core/services/lang.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { HubService } from '../../core/services/hub.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslateModule],
  template: `
    <nav class="sticky top-0 z-50 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border-b border-neutral-100 dark:border-neutral-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center h-16 gap-4">

          <!-- Logo -->
          <a routerLink="/" class="flex items-center gap-2.5 flex-shrink-0">
            <div class="w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center shadow-glow">
              <span class="text-white font-bold text-base">و</span>
            </div>
            <span class="font-bold text-lg text-neutral-900 dark:text-white hidden sm:block">
              Waseet
            </span>
          </a>

          <!-- Desktop nav — ONLY for non-admin users -->
          <div class="hidden md:flex items-center gap-1 flex-1 ms-4">
            @if (!isAdmin()) {
              <a routerLink="/browse" routerLinkActive="text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20"
                class="px-3 py-2 rounded-xl text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-brand-600 hover:bg-brand-50 transition-all">
                {{ 'nav.browse' | translate }}
              </a>
              @if (auth.isLoggedIn()) {
                <a routerLink="/dashboard" routerLinkActive="text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20"
                  class="px-3 py-2 rounded-xl text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-brand-600 hover:bg-brand-50 transition-all">
                  {{ 'nav.dashboard' | translate }}
                </a>
              }
              @if (auth.isLoggedIn() && auth.isClient()) {
                <a routerLink="/my-tasks" routerLinkActive="text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20"
                  class="px-3 py-2 rounded-xl text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-brand-600 hover:bg-brand-50 transition-all">
                  My Tasks
                </a>
              }
            } @else {
              <!-- Admin sees admin link only -->
              <a routerLink="/admin"
                class="px-3 py-2 rounded-xl text-sm font-medium text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-all">
                🛡 Admin Panel
              </a>
            }
          </div>

          <div class="flex items-center gap-2 ms-auto">

            <!-- Post Task — only for non-admin clients -->
            @if (auth.isLoggedIn() && auth.isClient() && !isAdmin()) {
              <a routerLink="/post-task" class="btn-primary hidden sm:inline-flex text-xs py-2 px-3 flex-shrink-0">
                + {{ 'nav.post' | translate }}
              </a>
            }

            <!-- Chat inbox icon -->
            @if (auth.isLoggedIn()) {
              <a routerLink="/chat/inbox"
                 class="relative w-9 h-9 flex items-center justify-center rounded-xl text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
                </svg>
                @if (totalUnreadMessages() > 0) {
                  <span class="absolute -top-0.5 -end-0.5 w-4 h-4 bg-brand-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {{ totalUnreadMessages() > 9 ? '9+' : totalUnreadMessages() }}
                  </span>
                }
              </a>

              <!-- Notifications bell -->
              <div class="relative">
                <button (click)="notifOpen.update(v => !v)"
                  class="relative w-9 h-9 flex items-center justify-center rounded-xl text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                  </svg>
                  @if (notifService.unreadCount() > 0) {
                    <span class="absolute -top-0.5 -end-0.5 w-4 h-4 bg-danger-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse-dot">
                      {{ notifService.unreadCount() > 9 ? '9+' : notifService.unreadCount() }}
                    </span>
                  }
                </button>

                <!-- Notification dropdown -->
                @if (notifOpen()) {
                  <div class="absolute end-0 top-12 w-80 card shadow-soft border border-neutral-100 dark:border-neutral-800 overflow-hidden animate-slide-down z-50">
                    <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
                      <p class="font-semibold text-sm text-neutral-900 dark:text-white">Notifications</p>
                      @if (notifService.unreadCount() > 0) {
                        <button (click)="notifService.markAllRead()" class="text-xs text-brand-600 hover:underline">
                          Mark all read
                        </button>
                      }
                    </div>
                    <div class="max-h-80 overflow-y-auto">
                      @if (notifService.notifications().length === 0) {
                        <div class="py-8 text-center text-sm text-neutral-400">No notifications yet</div>
                      }
                      @for (n of notifService.notifications().slice(0, 5); track n.notificationId) {
                        <div (click)="onNotifClick(n)"
                          [class]="n.isRead
                            ? 'px-4 py-3 border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors'
                            : 'px-4 py-3 border-b border-neutral-50 dark:border-neutral-800/50 bg-brand-50 dark:bg-brand-900/10 hover:bg-brand-100/50 dark:hover:bg-brand-900/20 cursor-pointer transition-colors'">
                          <div class="flex items-start gap-2.5">
                            @if (!n.isRead) {
                              <div class="w-2 h-2 bg-brand-500 rounded-full flex-shrink-0 mt-1.5"></div>
                            } @else {
                              <div class="w-2 h-2 flex-shrink-0 mt-1.5"></div>
                            }
                            <div class="flex-1 min-w-0">
                              <p class="text-sm font-medium text-neutral-900 dark:text-white line-clamp-1">{{ n.title }}</p>
                              <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">{{ n.body }}</p>
                              <p class="text-[10px] text-neutral-400 mt-1">{{ n.createdAt | date:'d MMM, HH:mm' }}</p>
                            </div>
                          </div>
                        </div>
                      }
                    </div>
                    <a routerLink="/notifications" (click)="notifOpen.set(false)"
                      class="block text-center text-xs text-brand-600 dark:text-brand-400 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                      View all notifications →
                    </a>
                  </div>
                }
              </div>

              <!-- Profile avatar -->
              <a routerLink="/profile"
                class="avatar-sm flex-shrink-0 text-xs font-bold cursor-pointer hover:ring-2 hover:ring-brand-400 transition-all">
                {{ userInitial() }}
              </a>
            }

            <!-- Lang toggle -->
            <button (click)="lang.toggle()"
              class="w-9 h-9 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex-shrink-0">
              {{ lang.isArabic() ? 'EN' : 'ع' }}
            </button>

            <!-- Theme toggle -->
            <button (click)="theme.toggle()"
              class="w-9 h-9 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex-shrink-0">
              @if (theme.isDark()) { <span class="text-base">☀️</span> }
              @else { <span class="text-base">🌙</span> }
            </button>

            @if (!auth.isLoggedIn()) {
              <a routerLink="/auth/login" class="btn-secondary text-xs py-2 px-3 flex-shrink-0">
                {{ 'nav.login' | translate }}
              </a>
              <a routerLink="/auth/register" class="btn-primary text-xs py-2 px-3 flex-shrink-0">
                {{ 'nav.register' | translate }}
              </a>
            } @else {
              <button (click)="auth.logout()"
                class="hidden sm:block text-xs text-neutral-500 dark:text-neutral-400 hover:text-danger-500 transition-colors">
                {{ 'nav.logout' | translate }}
              </button>
            }

            <!-- Mobile menu toggle -->
            <button (click)="mobileOpen.update(v => !v)"
              class="md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
              @if (mobileOpen()) { ✕ } @else { ☰ }
            </button>
          </div>
        </div>

        <!-- Mobile menu — conditional on role -->
        @if (mobileOpen()) {
          <div class="md:hidden pb-4 border-t border-neutral-100 dark:border-neutral-800 pt-3 animate-slide-down">
            <div class="space-y-1">
              @if (!isAdmin()) {
                <a routerLink="/browse" (click)="mobileOpen.set(false)"
                  class="block px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                  {{ 'nav.browse' | translate }}
                </a>
                @if (auth.isLoggedIn()) {
                  <a routerLink="/dashboard" (click)="mobileOpen.set(false)"
                    class="block px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                    {{ 'nav.dashboard' | translate }}
                  </a>
                  <a routerLink="/chat/inbox" (click)="mobileOpen.set(false)"
                    class="block px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                    Messages
                  </a>
                  <a routerLink="/notifications" (click)="mobileOpen.set(false)"
                    class="block px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                    Notifications
                  </a>
                  @if (auth.isClient()) {
                    <a routerLink="/post-task" (click)="mobileOpen.set(false)"
                      class="block px-3 py-2.5 rounded-xl text-sm font-medium bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400">
                      + {{ 'nav.post' | translate }}
                    </a>
                  }
                }
              } @else {
                <a routerLink="/admin" (click)="mobileOpen.set(false)"
                  class="block px-3 py-2.5 rounded-xl text-sm font-medium text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/20">
                  🛡 Admin Panel
                </a>
              }
              @if (auth.isLoggedIn()) {
                <button (click)="auth.logout()"
                  class="w-full text-start px-3 py-2.5 rounded-xl text-sm font-medium text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/20">
                  {{ 'nav.logout' | translate }}
                </button>
              }
            </div>
          </div>
        }
      </div>
    </nav>

    <!-- Click outside to close notif dropdown -->
    @if (notifOpen()) {
      <div class="fixed inset-0 z-40" (click)="notifOpen.set(false)"></div>
    }
  `
})
export class NavbarComponent implements OnInit {
  theme = inject(ThemeService);
  lang = inject(LangService);
  auth = inject(AuthService);
  notifService = inject(NotificationService);
  private hub = inject(HubService);
  isAdmin = computed(() => this.auth.currentUser()?.role === 99);

  notifOpen = signal(false);
  mobileOpen = signal(false);
  totalUnreadMessages = signal(0);


  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.hub.connect();
      this.notifService.load(this.lang.isArabic() ? 'ar' : 'en');
    }
  }

  userInitial(): string {
    const email = this.auth.currentUser()?.email ?? '';
    return email.charAt(0).toUpperCase();
  }

  onNotifClick(n: any) {
    if (!n.isRead) this.notifService.markRead(n.notificationId);
    if (n.relatedUrl) window.location.href = n.relatedUrl;
    this.notifOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    this.notifOpen.set(false);
    this.mobileOpen.set(false);
  }
}