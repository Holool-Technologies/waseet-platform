import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ThemeService } from '../../core/services/theme.service';
import { LangService } from '../../core/services/lang.service';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslateModule],
  template: `
    <nav class="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">

          <a routerLink="/" class="flex items-center gap-2">
            <div class="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-sm">و</span>
            </div>
            <span class="font-bold text-xl text-gray-900 dark:text-white">
              {{ 'app.name' | translate }}
            </span>
          </a>

          <div class="hidden md:flex items-center gap-6">
            <a routerLink="/browse" routerLinkActive="text-primary-500"
               class="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-500 transition-colors">
              {{ 'nav.browse' | translate }}
            </a>
            @if (auth.isLoggedIn()) {
              <a routerLink="/dashboard" routerLinkActive="text-primary-500"
                 class="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-500 transition-colors">
                {{ 'nav.dashboard' | translate }}
              </a>
              @if (auth.isClient()) {
                <a routerLink="/post-task"
                   class="btn-primary text-sm">
                  {{ 'nav.post' | translate }}
                </a>
              }
            }
          </div>

          <div class="flex items-center gap-3">
            <!-- Lang toggle -->
            <button (click)="lang.toggle()"
              class="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              {{ lang.isArabic() ? 'EN' : 'ع' }}
            </button>

            <!-- Theme toggle -->
            <button (click)="theme.toggle()"
              class="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              @if (theme.isDark()) { ☀️ } @else { 🌙 }
            </button>

            @if (auth.isLoggedIn()) {
              <button (click)="auth.logout()"
                class="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors">
                {{ 'nav.logout' | translate }}
              </button>
            } @else {
              <a routerLink="/auth/login" class="btn-outline text-sm">
                {{ 'nav.login' | translate }}
              </a>
            }
          </div>
        </div>
      </div>
    </nav>
  `
})
export class NavbarComponent {
  theme = inject(ThemeService);
  lang = inject(LangService);
  auth = inject(AuthService);
}