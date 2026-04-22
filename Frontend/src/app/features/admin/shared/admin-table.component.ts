import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TableColumn {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'badge' | 'money' | 'number';
  badgeMap?: Record<string, string>;
}

@Component({
  selector: 'app-admin-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
            <tr>
              @for (col of columns; track col.key) {
                <th class="px-4 py-3 text-start text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  {{ col.label }}
                </th>
              }
              @if (actions.length > 0) {
                <th class="px-4 py-3 text-end text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              }
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700/50">
            @if (loading) {
              @for (i of [1,2,3,4,5]; track i) {
                <tr>
                  @for (col of columns; track col.key) {
                    <td class="px-4 py-3"><div class="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div></td>
                  }
                </tr>
              }
            } @else if (rows.length === 0) {
              <tr>
                <td [attr.colspan]="columns.length + (actions.length > 0 ? 1 : 0)"
                  class="px-4 py-12 text-center text-gray-400">
                  No records found.
                </td>
              </tr>
            } @else {
              @for (row of rows; track row[idKey]) {
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                  @for (col of columns; track col.key) {
                    <td class="px-4 py-3 text-gray-900 dark:text-gray-200 whitespace-nowrap">
                      @if (col.type === 'date') {
                        {{ row[col.key] | date:'d MMM yy, HH:mm' }}
                      } @else if (col.type === 'money') {
                        <span class="font-semibold text-primary-500">\${{ row[col.key] | number:'1.2-2' }}</span>
                      } @else if (col.type === 'badge') {
                        <span [class]="'badge-status ' + getBadgeClass(col, row[col.key])">
                          {{ row[col.key] }}
                        </span>
                      } @else if (col.type === 'number') {
                        {{ row[col.key] | number }}
                      } @else {
                        <span class="max-w-xs truncate block" [title]="row[col.key]">{{ row[col.key] }}</span>
                      }
                    </td>
                  }
                  @if (actions.length > 0) {
                    <td class="px-4 py-3 text-end">
                      <div class="flex items-center justify-end gap-2">
                        @for (action of actions; track action.label) {
                          <button
                            (click)="actionClick.emit({ action: action.key, row })"
                            [class]="action.danger
                              ? 'text-xs px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors'
                              : 'text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'">
                            {{ action.label }}
                          </button>
                        }
                      </div>
                    </td>
                  }
                </tr>
              }
            }
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      @if (totalPages > 1) {
        <div class="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
          <p class="text-xs text-gray-400">
            Showing {{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, totalCount) }} of {{ totalCount }}
          </p>
          <div class="flex gap-2">
            <button (click)="pageChange.emit(page - 1)" [disabled]="page === 1"
              class="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              ← Prev
            </button>
            <button (click)="pageChange.emit(page + 1)" [disabled]="page === totalPages"
              class="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Next →
            </button>
          </div>
        </div>
      }
    </div>
  `
})
export class AdminTableComponent {
  @Input() columns: TableColumn[] = [];
  @Input() rows: any[] = [];
  @Input() actions: { key: string; label: string; danger?: boolean }[] = [];
  @Input() loading = false;
  @Input() idKey = 'id';
  @Input() page = 1;
  @Input() pageSize = 20;
  @Input() totalCount = 0;
  @Input() totalPages = 1;
  @Output() actionClick = new EventEmitter<{ action: string; row: any }>();
  @Output() pageChange = new EventEmitter<number>();

  Math = Math;

  getBadgeClass(col: TableColumn, value: string): string {
    const map = col.badgeMap ?? {};
    return map[value] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
  }
}