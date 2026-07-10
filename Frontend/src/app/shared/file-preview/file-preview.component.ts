import {
  Component, Input, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PreviewFile {
  file?: File;           // for upload preview
  name: string;
  size: number;
  type: string;
  url?: string;          // for existing files
}

@Component({
  selector: 'app-file-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-2">
      @for (f of files; track f.name) {
        <div class="flex items-center gap-3 p-3 rounded-xl border
                    border-neutral-100 dark:border-neutral-800
                    bg-white dark:bg-neutral-900/50">

          <!-- Thumbnail or icon -->
          <div class="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0
                      bg-neutral-100 dark:bg-neutral-800
                      flex items-center justify-center">
            @if (isImage(f) && getPreviewUrl(f)) {
              <img [src]="getPreviewUrl(f)"
                   [alt]="f.name"
                   class="w-full h-full object-cover" />
            } @else {
              <span class="text-xl">{{ getIcon(f) }}</span>
            }
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-neutral-900 dark:text-white
                       truncate">
              {{ f.name }}
            </p>
            <p class="text-xs text-neutral-400">
              {{ getTypeLabel(f) }} · {{ formatSize(f.size) }}
            </p>
          </div>

          <!-- Remove button (upload mode) -->
          @if (removable && onRemove) {
            <button (click)="onRemove(f)"
              class="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800
                     text-neutral-400 hover:bg-danger-50 dark:hover:bg-danger-900/20
                     hover:text-danger-500 transition-colors flex items-center
                     justify-center text-xs flex-shrink-0">
              ✕
            </button>
          }

          <!-- Download button (view mode) -->
          @if (f.url && !removable) {
            <a [href]="f.url" target="_blank" rel="noopener"
               class="text-xs text-brand-600 dark:text-brand-400
                      hover:underline flex-shrink-0">
              ↓
            </a>
          }
        </div>
      }
    </div>
  `
})
export class FilePreviewComponent {
  @Input({ required: true }) files: PreviewFile[] = [];
  @Input() removable = false;
  @Input() onRemove?: (f: PreviewFile) => void;

  private objectUrls = new Map<string, string>();

  isImage(f: PreviewFile): boolean {
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.name)
      || f.type.startsWith('image/');
  }

  getPreviewUrl(f: PreviewFile): string {
    if (f.url) return f.url;
    if (!f.file) return '';

    // Create object URL for local file preview
    if (!this.objectUrls.has(f.name)) {
      this.objectUrls.set(f.name, URL.createObjectURL(f.file));
    }
    return this.objectUrls.get(f.name)!;
  }

  getIcon(f: PreviewFile): string {
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    const map: Record<string, string> = {
      pdf:  '📄', doc: '📝', docx: '📝',
      xls:  '📊', xlsx: '📊',
      zip:  '🗜', rar: '🗜', '7z': '🗜',
      mp4:  '🎬', mov: '🎬', avi: '🎬',
      mp3:  '🎵', wav: '🎵',
      jpg:  '🖼', jpeg: '🖼', png: '🖼',
      gif:  '🖼', webp: '🖼', svg: '🖼',
    };
    return map[ext] ?? '📎';
  }

  getTypeLabel(f: PreviewFile): string {
    const ext = f.name.split('.').pop()?.toUpperCase() ?? '';
    return ext || (f.type.split('/')[1]?.toUpperCase() ?? 'FILE');
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  ngOnDestroy() {
    // Clean up object URLs to prevent memory leaks
    this.objectUrls.forEach(url => URL.revokeObjectURL(url));
  }
}