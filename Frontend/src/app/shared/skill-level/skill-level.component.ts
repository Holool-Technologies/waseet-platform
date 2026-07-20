import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LangService } from '../../core/services/lang.service';
import { SkillLevelInfo } from '../../core/models/profile.models';

@Component({
  selector: 'app-skill-level',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center gap-2">

      <!-- Badge pill -->
      <div class="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold"
        [style.background]="bgColor()"
        [style.color]="info.color">
        <span>{{ info.emoji }}</span>
        <span>{{ lang.isArabic() ? info.labelAr : info.label }}</span>
      </div>

      <!-- Progress bar toward next level (optional) -->
      @if (showProgress && info.level < 5) {
        <div class="flex items-center gap-2 flex-1 min-w-0">
          <div class="flex-1 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full min-w-0">
            <div class="h-1.5 rounded-full transition-all duration-500"
              [style.width.%]="info.progress"
              [style.background]="info.color">
            </div>
          </div>
          <span class="text-xs text-neutral-400 flex-shrink-0">
            {{ info.progress | number:'1.0-0' }}%
          </span>
        </div>
      }

      @if (showProgress && info.level === 5) {
        <span class="text-xs text-neutral-400">Max level</span>
      }
    </div>
  `
})
export class SkillLevelComponent {
  @Input({ required: true }) info!: SkillLevelInfo;
  @Input() showProgress = false;

  lang = inject(LangService);

  bgColor(): string {
    return this.hexToRgba(this.info.color, 0.12);
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
}