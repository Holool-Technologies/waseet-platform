import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { TaskService } from '../../../core/services/task.service';
import { AuthService } from '../../../core/services/auth.service';
import { WaseetTask } from '../../../core/models/task.models';

const CATEGORIES = [
  { value: null,  label: 'All Categories' },
  { value: 1,     label: 'Programming & Development' },
  { value: 2,     label: 'Design & Creative' },
  { value: 3,     label: 'Writing & Translation' },
  { value: 4,     label: 'Marketing & Sales' },
  { value: 5,     label: 'Video & Animation' },
  { value: 6,     label: 'Music & Audio' },
  { value: 7,     label: 'Data Science' },
  { value: 8,     label: 'Business & Consulting' },
  { value: 9,     label: 'Admin & Support' },
];

@Component({
  selector: 'app-browse',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TranslateModule],
  template: `
    <div class="max-w-7xl mx-auto px-4 py-8">

      <!-- Header — REQ 3 fix: button always visible including mobile -->
      <div class="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ 'task.browse' | translate }}
        </h1>
        <!-- REQ 3: always visible, flex-shrink-0 prevents disappearing -->
        @if (auth.isClient()) {
          <a routerLink="/post-task"
             class="btn-primary flex-shrink-0 text-sm">
            + Post a Task
          </a>
        }
      </div>

      <!-- REQ 2: Filters + Sort bar -->
      <div class="card p-4 mb-6">
        <div class="flex flex-wrap gap-3">

          <!-- Search -->
          <input [(ngModel)]="search" (ngModelChange)="onFilter()"
            placeholder="Search tasks..."
            class="input-field flex-1 min-w-[180px] text-sm py-2" />

          <!-- REQ 2: Category filter -->
          <select [(ngModel)]="selectedCategory" (ngModelChange)="onFilter()"
            class="input-field w-auto min-w-[180px] text-sm py-2">
            @for (cat of categories; track cat.value) {
              <option [ngValue]="cat.value">{{ cat.label }}</option>
            }
          </select>

          <!-- Sort -->
          <select [(ngModel)]="sortBy" (ngModelChange)="onFilter()"
            class="input-field w-auto min-w-[160px] text-sm py-2">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="budget_desc">Highest budget</option>
            <option value="budget_asc">Lowest budget</option>
          </select>

          <!-- Budget range -->
          <div class="flex items-center gap-2 min-w-[200px]">
            <input [(ngModel)]="minBudget" (ngModelChange)="onFilter()"
              type="number" placeholder="Min $" class="input-field text-sm py-2 w-24" />
            <span class="text-gray-400 text-sm">–</span>
            <input [(ngModel)]="maxBudget" (ngModelChange)="onFilter()"
              type="number" placeholder="Max $" class="input-field text-sm py-2 w-24" />
          </div>

          <!-- Clear filters -->
          @if (hasFilters()) {
            <button (click)="clearFilters()"
              class="text-sm text-primary-500 hover:underline whitespace-nowrap self-center">
              Clear filters
            </button>
          }
        </div>

        <!-- REQ 2: Category pills -->
        <div class="flex flex-wrap gap-2 mt-3">
          @for (cat of categories; track cat.value) {
            <button
              (click)="selectedCategory = cat.value; onFilter()"
              [class]="selectedCategory === cat.value
                ? 'bg-primary-500 text-white text-xs px-3 py-1 rounded-full font-medium transition-all'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-3 py-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all'">
              {{ cat.label }}
            </button>
          }
        </div>
      </div>

      <!-- Results count -->
      <div class="flex items-center justify-between mb-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ total() }} task{{ total() !== 1 ? 's' : '' }} found
        </p>
      </div>

      <!-- Task grid -->
      @if (loading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="card p-6 animate-pulse">
              <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
              <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
              <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            </div>
          }
        </div>
      } @else if (tasks().length === 0) {
        <div class="text-center py-20">
          <p class="text-4xl mb-4">🔍</p>
          <p class="text-gray-400">{{ 'task.noTasks' | translate }}</p>
          @if (hasFilters()) {
            <button (click)="clearFilters()" class="btn-outline mt-4 text-sm">Clear filters</button>
          }
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (task of tasks(); track task.taskId) {
            <a [routerLink]="['/tasks', task.publicTaskCode]"
               class="card p-6 hover:shadow-md hover:border-primary-200 dark:hover:border-primary-800 transition-all duration-200 block group">

              <!-- REQ 2: Category badge — REQ 1: NO task code shown -->
              <div class="flex items-start justify-between mb-3">
                <span class="text-xs font-medium px-2.5 py-1 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                  {{ task.categoryLabel }}
                </span>
                <span [class]="statusClass(task.status)" class="badge-status text-xs">
                  {{ statusLabel(task.status) }}
                </span>
              </div>

              <h3 class="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-primary-500 transition-colors">
                {{ task.title }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                {{ task.description }}
              </p>

              <div class="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                <span class="text-lg font-bold text-primary-500">\${{ task.budgetUSD }}</span>
                <div class="flex items-center gap-3 text-xs text-gray-400">
                  <span>{{ task.proposalCount }} bids</span>
                  <span>{{ task.createdAt | date:'d MMM' }}</span>
                </div>
              </div>
            </a>
          }
        </div>

        <!-- Pagination -->
        @if (totalPages() > 1) {
          <div class="flex items-center justify-center gap-2 mt-10">
            <button (click)="changePage(currentPage() - 1)" [disabled]="currentPage() === 1"
              class="btn-outline text-sm px-3 py-2 disabled:opacity-40">← Prev</button>
            @for (p of pageNumbers(); track p) {
              <button (click)="changePage(p)"
                [class]="p === currentPage()
                  ? 'btn-primary text-sm px-3 py-2'
                  : 'btn-outline text-sm px-3 py-2'">
                {{ p }}
              </button>
            }
            <button (click)="changePage(currentPage() + 1)" [disabled]="currentPage() === totalPages()"
              class="btn-outline text-sm px-3 py-2 disabled:opacity-40">Next →</button>
          </div>
        }
      }
    </div>
  `
})
export class BrowseComponent implements OnInit {
  private taskService = inject(TaskService);
  auth = inject(AuthService);

  tasks = signal<WaseetTask[]>([]);
  loading = signal(true);
  total = signal(0);
  currentPage = signal(1);
  totalPages = signal(1);
  categories = CATEGORIES;

  search = '';
  selectedCategory: number | null = null;
  sortBy = 'newest';
  minBudget: number | null = null;
  maxBudget: number | null = null;

  hasFilters = computed(() =>
    !!this.search || this.selectedCategory !== null ||
    this.sortBy !== 'newest' || !!this.minBudget || !!this.maxBudget);

  pageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1)
      .filter(p => Math.abs(p - this.currentPage()) <= 2));

  ngOnInit() { this.load(); }

  onFilter() { this.currentPage.set(1); this.load(); }

  changePage(p: number) {
    if (p < 1 || p > this.totalPages()) return;
    this.currentPage.set(p);
    this.load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  clearFilters() {
    this.search = '';
    this.selectedCategory = null;
    this.sortBy = 'newest';
    this.minBudget = null;
    this.maxBudget = null;
    this.onFilter();
  }

  private load() {
    this.loading.set(true);
    this.taskService.browse(
      this.currentPage(),
      12,
      this.search || undefined,
      this.minBudget ?? undefined,
      this.maxBudget ?? undefined,
      undefined,
      this.selectedCategory ?? undefined,
      this.sortBy
    ).subscribe({
      next: (res: any) => {
        this.tasks.set(res.items ?? res);
        this.total.set(res.totalCount ?? res.length);
        this.totalPages.set(res.totalPages ?? 1);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  statusClass(status: number): string {
    const map: Record<number, string> = {
      0: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      1: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      2: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      3: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
      4: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    };
    return map[status] ?? map[0];
  }

  statusLabel(s: number) { return ['Open','Bidding','Active','Completed','Disputed'][s] ?? 'Open'; }
}