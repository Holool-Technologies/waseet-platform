import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { DashboardStats } from '../../../core/models/admin.models';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <button (click)="load()" class="text-sm text-primary-500 hover:underline">Refresh</button>
      </div>

      @if (loading()) {
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          @for (i of [1,2,3,4,5,6,7,8]; track i) {
            <div class="card p-5 animate-pulse">
              <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-3"></div>
              <div class="h-7 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          }
        </div>
      } @else if (stats()) {
        <!-- Users -->
        <div>
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Users</p>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="card p-5">
              <p class="text-xs text-gray-400 mb-1">Total Users</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats()!.totalUsers }}</p>
            </div>
            <div class="card p-5">
              <p class="text-xs text-gray-400 mb-1">Clients</p>
              <p class="text-2xl font-bold text-primary-500">{{ stats()!.totalClients }}</p>
            </div>
            <div class="card p-5">
              <p class="text-xs text-gray-400 mb-1">Freelancers</p>
              <p class="text-2xl font-bold text-primary-500">{{ stats()!.totalFreelancers }}</p>
            </div>
            <a routerLink="/admin/kyc" class="card p-5 hover:border-amber-300 dark:hover:border-amber-700 transition-colors">
              <p class="text-xs text-gray-400 mb-1">Pending KYC</p>
              <p class="text-2xl font-bold" [class]="stats()!.pendingKyc > 0 ? 'text-amber-500' : 'text-gray-900 dark:text-white'">
                {{ stats()!.pendingKyc }}
              </p>
              @if (stats()!.pendingKyc > 0) {
                <p class="text-xs text-amber-500 mt-1">Needs review →</p>
              }
            </a>
          </div>
        </div>

        <!-- Tasks -->
        <div>
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tasks</p>
          <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
            @for (s of taskStats(); track s.label) {
              <div class="card p-5">
                <p class="text-xs text-gray-400 mb-1">{{ s.label }}</p>
                <p class="text-2xl font-bold" [style.color]="s.color">{{ s.value }}</p>
              </div>
            }
          </div>
        </div>

        <!-- Escrow & Messages -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="card p-6">
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Escrow</p>
            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="text-sm text-gray-500">Total volume</span>
                <span class="font-bold text-gray-900 dark:text-white">\${{ stats()!.totalEscrowVolume | number:'1.2-2' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-500">Currently held</span>
                <span class="font-bold text-amber-500">\${{ stats()!.heldEscrowVolume | number:'1.2-2' }}</span>
              </div>
              @if (stats()!.disputedTasks > 0) {
                <a routerLink="/admin/escrow" class="block text-xs text-red-500 hover:underline">
                  {{ stats()!.disputedTasks }} disputed task(s) — resolve →
                </a>
              }
            </div>
          </div>

          <div class="card p-6">
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">AI Chat</p>
            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="text-sm text-gray-500">Total messages</span>
                <span class="font-bold text-gray-900 dark:text-white">{{ stats()!.totalMessages }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-500">Blocked messages</span>
                <span class="font-bold text-red-500">{{ stats()!.blockedMessages }}</span>
              </div>
              @if (stats()!.totalMessages > 0) {
                <p class="text-xs text-gray-400">
                  Block rate: {{ ((stats()!.blockedMessages / stats()!.totalMessages) * 100) | number:'1.1-1' }}%
                </p>
              }
            </div>
          </div>
        </div>

        <p class="text-xs text-gray-400 text-end">
          Last updated: {{ stats()!.generatedAt | date:'medium' }}
        </p>
      }
    </div>
  `
})
export class AdminDashboardComponent implements OnInit {
  private adminService = inject(AdminService);
  stats = signal<DashboardStats | null>(null);
  loading = signal(true);

  taskStats = () => {
    const s = this.stats();
    if (!s) return [];
    return [
      { label: 'Total',     value: s.totalTasks,     color: 'var(--color-text-primary)' },
      { label: 'Open',      value: s.openTasks,      color: '#22c55e' },
      { label: 'Active',    value: s.activeTasks,    color: '#3b82f6' },
      { label: 'Completed', value: s.completedTasks, color: '#6b7280' },
      { label: 'Disputed',  value: s.disputedTasks,  color: '#ef4444' },
    ];
  };

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.adminService.getStats().subscribe({
      next: s => { this.stats.set(s); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
}