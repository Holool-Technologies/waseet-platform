import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LangService } from '../../core/services/lang.service';
import { FreelancerStats } from '../../core/models/profile.models';

@Component({
  selector: 'app-portfolio-stats',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">

      <!-- Projects completed -->
      <div class="bg-brand-50 dark:bg-brand-900/20 rounded-2xl p-4">
        <p class="text-2xl font-bold text-brand-700 dark:text-brand-300">
          {{ stats.tasksCompleted }}
        </p>
        <p class="text-xs text-brand-600 dark:text-brand-400 mt-0.5">
          {{ lang.isArabic() ? 'مشاريع مكتملة' : 'Projects completed' }}
        </p>
      </div>

      <!-- Success rate -->
      <div class="bg-success-50 dark:bg-success-900/20 rounded-2xl p-4">
        <p class="text-2xl font-bold text-success-700 dark:text-success-300">
          {{ stats.successRate | number:'1.0-1' }}%
        </p>
        <p class="text-xs text-success-600 dark:text-success-400 mt-0.5">
          {{ lang.isArabic() ? 'معدل النجاح' : 'Success rate' }}
        </p>
      </div>

      <!-- Avg delivery time -->
      <div class="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4">
        <p class="text-2xl font-bold text-amber-700 dark:text-amber-300">
          {{ stats.avgDeliveryDays | number:'1.0-1' }}d
        </p>
        <p class="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
          {{ lang.isArabic() ? 'متوسط وقت التسليم' : 'Avg delivery time' }}
        </p>
      </div>

      <!-- Unique clients -->
      <div class="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-4">
        <p class="text-2xl font-bold text-purple-700 dark:text-purple-300">
          {{ stats.uniqueClientsCount }}
        </p>
        <p class="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
          {{ lang.isArabic() ? 'عملاء فريدون' : 'Unique clients' }}
        </p>
      </div>

      <!-- Skills mastered -->
      <div class="bg-cyan-50 dark:bg-cyan-900/20 rounded-2xl p-4">
        <p class="text-2xl font-bold text-cyan-700 dark:text-cyan-300">
          {{ stats.skillsCount }}
        </p>
        <p class="text-xs text-cyan-600 dark:text-cyan-400 mt-0.5">
          {{ lang.isArabic() ? 'مهارات' : 'Skills listed' }}
        </p>
      </div>

      <!-- Earnings range -->
      <div class="bg-neutral-100 dark:bg-neutral-800 rounded-2xl p-4">
        <p class="text-lg font-bold text-neutral-700 dark:text-neutral-300">
          {{ stats.earningsRange }}
        </p>
        <p class="text-xs text-neutral-500 mt-0.5">
          {{ lang.isArabic() ? 'نطاق الأرباح' : 'Earnings range' }}
        </p>
      </div>

    </div>
  `
})
export class PortfolioStatsComponent {
  @Input({ required: true }) stats!: FreelancerStats;
  lang = inject(LangService);
}