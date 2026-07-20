import { Component, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LangService } from '../../core/services/lang.service';
import { BadgeInfo } from '../../core/models/profile.models';

@Component({
  selector: 'app-badges',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-wrap gap-2">
      @for (badge of badges; track badge.type) {
        <div class="group relative">
          <!-- Badge chip -->
          <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                      bg-neutral-100 dark:bg-neutral-800
                      border border-neutral-200 dark:border-neutral-700
                      text-sm font-medium text-neutral-700 dark:text-neutral-300
                      cursor-default hover:border-brand-300 dark:hover:border-brand-700
                      transition-colors">
            <span class="text-base leading-none">{{ badge.emoji }}</span>
            <span class="text-xs">
              {{ lang.isArabic() ? badge.labelAr : badge.label }}
            </span>
          </div>

          <!-- Tooltip -->
          <div class="absolute bottom-full start-0 mb-2 w-56 z-20
                      opacity-0 group-hover:opacity-100
                      transition-opacity pointer-events-none">
            <div class="card p-3 shadow-soft text-xs leading-relaxed
                        text-neutral-600 dark:text-neutral-400">
              <p class="font-semibold text-neutral-900 dark:text-white mb-1">
                {{ badge.emoji }}
                {{ lang.isArabic() ? badge.labelAr : badge.label }}
              </p>
              <p>
                {{ lang.isArabic()
                   ? badge.descriptionAr
                   : badge.description }}
              </p>
              <p class="text-neutral-400 mt-1">
                Earned {{ badge.earnedAt | date:'d MMM yyyy' }}
              </p>
            </div>
            <!-- Arrow -->
            <div class="w-3 h-3 bg-white dark:bg-neutral-900
                        border-b border-e border-neutral-100
                        dark:border-neutral-800 rotate-45
                        ms-3 -mt-1.5"></div>
          </div>
        </div>
      }
    </div>
  `
})
export class BadgesComponent {
  @Input({ required: true }) badges: BadgeInfo[] = [];
  lang = inject(LangService);
}