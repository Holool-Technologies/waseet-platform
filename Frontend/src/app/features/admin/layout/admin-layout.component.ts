import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

const NAV_ITEMS = [
  { path: '/admin/dashboard',    label: 'Dashboard',       icon: '📊' },
  { path: '/admin/users',        label: 'Users',           icon: '👥' },
  { path: '/admin/kyc',          label: 'KYC Queue',       icon: '🪪' },
  { path: '/admin/task-approval',label: 'Task Approval',   icon: '✅' },
  { path: '/admin/tasks',        label: 'All Tasks',       icon: '📋' },
  { path: '/admin/portfolio',    label: 'Portfolio Review', icon: '🖼' },
  { path: '/admin/escrow',       label: 'Escrow',          icon: '💰' },
  { path: '/admin/chat-logs',    label: 'Chat Logs',       icon: '💬' },
];

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <div class="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">

      <!-- Sidebar -->
      <aside [class]="sidebarOpen()
        ? 'w-64 flex flex-col bg-white dark:bg-gray-900 border-e border-gray-100 dark:border-gray-800 transition-all duration-200'
        : 'w-16 flex flex-col bg-white dark:bg-gray-900 border-e border-gray-100 dark:border-gray-800 transition-all duration-200'">

        <!-- Logo -->
        <div class="flex items-center gap-3 px-4 h-16 border-b border-gray-100 dark:border-gray-800">
          <div class="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <span class="text-white font-bold text-sm">و</span>
          </div>
          @if (sidebarOpen()) {
            <div>
              <p class="font-bold text-gray-900 dark:text-white text-sm">Waseet</p>
              <p class="text-xs text-red-500 font-medium">Admin Panel</p>
            </div>
          }
        </div>

        <!-- Nav -->
        <nav class="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          @for (item of navItems; track item.path) {
            <a [routerLink]="item.path" routerLinkActive="bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
               class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium">
              <span class="text-lg flex-shrink-0" style="font-size:16px">{{ item.icon }}</span>
              @if (sidebarOpen()) { <span>{{ item.label }}</span> }
            </a>
          }
        </nav>

        <!-- Footer -->
        <div class="p-3 border-t border-gray-100 dark:border-gray-800 space-y-1">
          <button (click)="theme.toggle()"
            class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm">
            <span style="font-size:16px">{{ theme.isDark() ? '☀️' : '🌙' }}</span>
            @if (sidebarOpen()) { <span>{{ theme.isDark() ? 'Light mode' : 'Dark mode' }}</span> }
          </button>
          <button (click)="auth.logout()"
            class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm">
            <span style="font-size:16px">🚪</span>
            @if (sidebarOpen()) { <span>Logout</span> }
          </button>
        </div>
      </aside>

      <!-- Main -->
      <div class="flex-1 flex flex-col overflow-hidden">

        <!-- Top bar -->
        <header class="h-16 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center px-4 gap-4">
          <button (click)="sidebarOpen.update(v => !v)"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            ☰
          </button>
          <h1 class="text-sm font-medium text-gray-500 dark:text-gray-400">
            Waseet Admin — <span class="text-gray-900 dark:text-white">{{ auth.currentUser()?.email }}</span>
          </h1>
        </header>

        <!-- Page content -->
        <main class="flex-1 overflow-y-auto p-6">
          <router-outlet />
        </main>
      </div>
    </div>
  `
})
export class AdminLayoutComponent {
  auth = inject(AuthService);
  theme = inject(ThemeService);
  sidebarOpen = signal(true);
  navItems = NAV_ITEMS;
}