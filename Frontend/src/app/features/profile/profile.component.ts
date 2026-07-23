import {
  Component, inject, OnInit, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { LangService } from '../../core/services/lang.service';
import { FilePreviewComponent, PreviewFile } from '../../shared/file-preview/file-preview.component';
import { SkillLevelComponent } from '../../shared/skill-level/skill-level.component';
import { BadgesComponent } from '../../shared/badges/badges.component';
import { PortfolioStatsComponent } from '../../shared/portfolio-stats/portfolio-stats.component';
import { environment } from '../../../environments/environment';

// ── Local interfaces (own profile — not public) ────────────────────────────

interface OwnPortfolioItem {
  itemId:     string;
  imageUrl:   string;
  caption:    string;
  status:     'Pending' | 'Approved' | 'Rejected';
  adminNotes: string;
  uploadedAt: string;
}

interface OwnProfile {
  userId:      string;
  title:       string;
  bio:         string;
  bioOriginal: string;
  skills:      string[];
  balance:     number;
  isPublished: boolean;
  portfolio:   OwnPortfolioItem[];
  // Stats (may be null for new users)
  stats?: {
    tasksCompleted:     number;
    tasksAwarded:       number;
    successRate:        number;
    avgDeliveryDays:    number;
    earningsRange:      string;
    uniqueClientsCount: number;
    skillsCount:        number;
    skillLevel: {
      key:         string;
      label:       string;
      labelAr:     string;
      emoji:       string;
      color:       string;
      level:       number;
      nextLevelAt: number;
      progress:    number;
    };
    badges: Array<{
      type:          string;
      label:         string;
      labelAr:       string;
      emoji:         string;
      description:   string;
      descriptionAr: string;
      earnedAt:      string;
    }>;
  };
}

interface BioPreview {
  original:    string;
  filtered:    string;
  wasModified: boolean;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TranslateModule,
    FilePreviewComponent,
    SkillLevelComponent,
    BadgesComponent,
    PortfolioStatsComponent
  ],
  template: `
    <div class="page">
      <div class="max-w-4xl mx-auto space-y-6">

        <!-- ── Header ──────────────────────────────────────────────────── -->
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 class="section-title">
              {{ 'profile.title' | translate }}
            </h1>
            <p class="section-sub">
              Manage your public freelancer profile
            </p>
          </div>
          <span [class]="profile()?.isPublished ? 'badge-green' : 'badge-amber'">
            {{ profile()?.isPublished ? 'Published' : 'Draft' }}
          </span>
        </div>

        @if (pageLoading()) {
          <!-- Skeleton -->
          <div class="space-y-4 animate-pulse">
            <div class="card p-6 h-32 skeleton rounded-2xl"></div>
            <div class="card p-6 h-48 skeleton rounded-2xl"></div>
          </div>
        } @else if (profile()) {

          <!-- ── Balance card ────────────────────────────────────────── -->
          <div class="card p-6 bg-gradient-to-br from-brand-600 to-brand-800
                      text-white border-0">
            <p class="text-sm text-brand-200 mb-1">Account Balance</p>
            <p class="text-4xl font-bold">
              \${{ profile()!.balance | number:'1.2-2' }}
            </p>
            <p class="text-xs text-brand-300 mt-2">
              Earnings from completed tasks
            </p>
          </div>

          <!-- ── Skill level (only if has stats) ───────────────────── -->
          @if (profile()!.stats?.skillLevel) {
            <div class="card p-5">
              <div class="flex items-center justify-between flex-wrap gap-3 mb-4">
                <h2 class="text-base font-semibold
                           text-neutral-900 dark:text-white">
                  Skill Level
                </h2>
                @if (profile()!.stats!.skillLevel.level < 5) {
                  <span class="text-xs text-neutral-400">
                    {{ profile()!.stats!.tasksCompleted }}
                    /
                    {{ profile()!.stats!.skillLevel.nextLevelAt }}
                    tasks to next level
                  </span>
                } @else {
                  <span class="badge-green text-xs">Max level reached</span>
                }
              </div>
              <app-skill-level
                [info]="profile()!.stats!.skillLevel"
                [showProgress]="true">
              </app-skill-level>
            </div>
          }

          <!-- ── Platform stats ────────────────────────────────────── -->
          @if (profile()!.stats) {
            <div class="card p-6">
              <h2 class="text-base font-semibold
                         text-neutral-900 dark:text-white mb-5">
                Your Stats
              </h2>
              <app-portfolio-stats
                [stats]="profile()!.stats!">
              </app-portfolio-stats>
            </div>
          }

          <!-- ── Badges ─────────────────────────────────────────────── -->
          @if (profile()!.stats?.badges?.length) {
            <div class="card p-6">
              <h2 class="text-base font-semibold
                         text-neutral-900 dark:text-white mb-4">
                Badges
              </h2>
              <app-badges [badges]="profile()!.stats!.badges">
              </app-badges>
            </div>
          }

          <!-- ── Bio & Skills ───────────────────────────────────────── -->
          <div class="card p-6">
            <div class="flex items-center justify-between mb-5">
              <h2 class="text-lg font-semibold
                         text-neutral-900 dark:text-white">
                Bio & Skills
              </h2>
              @if (!editingBio()) {
                <button (click)="startEditBio()"
                  class="btn-secondary btn-sm">
                  Edit
                </button>
              }
            </div>

            @if (!editingBio()) {
              <!-- View mode -->
              <div class="space-y-4">
                @if (profile()!.title) {
                  <div>
                    <p class="text-xs text-neutral-400 uppercase
                               tracking-wider mb-1">Title</p>
                    <p class="font-semibold text-neutral-900 dark:text-white">
                      {{ profile()!.title }}
                    </p>
                  </div>
                }

                @if (profile()!.bio) {
                  <div>
                    <p class="text-xs text-neutral-400 uppercase
                               tracking-wider mb-1">About</p>
                    <p class="text-sm text-neutral-600 dark:text-neutral-400
                              leading-relaxed">
                      {{ profile()!.bio }}
                    </p>
                  </div>
                } @else {
                  <div class="py-6 text-center border-2 border-dashed
                              border-neutral-200 dark:border-neutral-700
                              rounded-xl">
                    <p class="text-sm text-neutral-400">
                      No bio yet. Click Edit to add one.
                    </p>
                  </div>
                }

                @if (profile()!.skills?.length) {
                  <div>
                    <p class="text-xs text-neutral-400 uppercase
                               tracking-wider mb-2">Skills</p>
                    <div class="flex flex-wrap gap-2">
                      @for (skill of profile()!.skills; track skill) {
                        <span class="badge-blue">{{ skill }}</span>
                      }
                    </div>
                  </div>
                }
              </div>

            } @else {
              <!-- Edit mode -->
              <div class="space-y-4">
                <div>
                  <label class="input-label">Professional Title</label>
                  <input [(ngModel)]="editTitle" class="input"
                    placeholder="e.g. Full Stack Developer" />
                </div>

                <div>
                  <label class="input-label">Bio</label>
                  <textarea [(ngModel)]="editBio" rows="5"
                    class="input resize-none"
                    placeholder="Describe your professional experience...">
                  </textarea>
                  <p class="input-hint">
                    AI will automatically improve tone and professionalism.
                  </p>
                </div>

                <div>
                  <label class="input-label">
                    Skills (comma separated)
                  </label>
                  <input [(ngModel)]="editSkills" class="input"
                    placeholder="React, Node.js, PostgreSQL" />
                </div>

                <!-- AI preview -->
                @if (bioPreview()) {
                  <div class="bg-brand-50 dark:bg-brand-900/20
                              border border-brand-200 dark:border-brand-800
                              rounded-xl p-4">
                    <p class="text-xs font-semibold text-brand-700
                               dark:text-brand-300 mb-2">
                      🤖 AI-improved version:
                    </p>
                    <p class="text-sm text-neutral-700 dark:text-neutral-300
                              leading-relaxed">
                      {{ bioPreview()!.filtered }}
                    </p>
                  </div>
                }

                <div class="flex flex-wrap gap-2">
                  <button (click)="previewBio()"
                    [disabled]="previewLoading()"
                    class="btn-secondary btn-sm">
                    {{ previewLoading() ? 'Analyzing...' : '✨ Preview AI version' }}
                  </button>
                  <button (click)="saveBio()"
                    [disabled]="saveLoading()"
                    class="btn-primary btn-sm">
                    {{ saveLoading() ? 'Saving...' : 'Save Profile' }}
                  </button>
                  <button (click)="cancelEdit()" class="btn-ghost btn-sm">
                    Cancel
                  </button>
                </div>
              </div>
            }
          </div>

          <!-- ── Portfolio ──────────────────────────────────────────── -->
          <div class="card p-6">
            <div class="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div>
                <h2 class="text-lg font-semibold
                           text-neutral-900 dark:text-white">
                  Portfolio
                </h2>
                <p class="text-xs text-neutral-400 mt-0.5">
                  Images are reviewed before publishing.
                  No human figures allowed.
                </p>
              </div>
              <label class="btn-primary btn-sm cursor-pointer">
                + Upload Image
                <input type="file"
                  accept="image/jpeg,image/png,image/webp"
                  class="hidden"
                  (change)="onFileSelect($event)" />
              </label>
            </div>

            <!-- Upload progress -->
            @if (uploading()) {
              <div class="mb-4 p-3 bg-brand-50 dark:bg-brand-900/20
                          rounded-xl flex items-center gap-3">
                <div class="w-5 h-5 border-2 border-brand-500
                            border-t-transparent rounded-full
                            animate-spin flex-shrink-0"></div>
                <p class="text-sm text-brand-700 dark:text-brand-300">
                  Uploading and scanning for content...
                </p>
              </div>
            }

            <!-- Portfolio grid -->
            @if (!profile()!.portfolio?.length) {
              <div class="py-12 text-center border-2 border-dashed
                          border-neutral-200 dark:border-neutral-700
                          rounded-xl">
                <p class="text-4xl mb-3">🖼</p>
                <p class="text-sm font-medium text-neutral-500">
                  No portfolio images yet
                </p>
                <p class="text-xs text-neutral-400 mt-1">
                  Upload images of your work to attract clients
                </p>
              </div>
            } @else {
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                @for (item of profile()!.portfolio; track item.itemId) {
                  <div class="relative group rounded-2xl overflow-hidden
                              aspect-square
                              bg-neutral-100 dark:bg-neutral-800">
                    <img [src]="resolveUrl(item.imageUrl)"
                      [alt]="item.caption"
                      class="w-full h-full object-cover"
                      (error)="onImgError($event)" />

                    <!-- Hover overlay -->
                    <div class="absolute inset-0 bg-black/40 opacity-0
                                group-hover:opacity-100 transition-opacity
                                flex flex-col items-center justify-center
                                gap-2 p-3">
                      <span [class]="getPortfolioBadge(item.status)">
                        {{ item.status }}
                      </span>
                      @if (item.adminNotes) {
                        <p class="text-white text-xs text-center
                                  line-clamp-2">
                          {{ item.adminNotes }}
                        </p>
                      }
                    </div>

                    <!-- Always-visible status badge -->
                    <div class="absolute top-2 end-2">
                      <span [class]="getPortfolioBadge(item.status)"
                        class="text-[10px]">
                        {{ item.status }}
                      </span>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

        } @else {
          <!-- Error state -->
          <div class="card p-12 text-center">
            <p class="text-3xl mb-3">⚠</p>
            <p class="font-semibold text-neutral-700 dark:text-neutral-300">
              Could not load profile
            </p>
            <button (click)="load()" class="btn-secondary mt-4">
              Try again
            </button>
          </div>
        }

      </div>
    </div>
  `
})
export class ProfileComponent implements OnInit {
  private http      = inject(HttpClient);
  private auth      = inject(AuthService);
  private toast     = inject(ToastService);
  private translate = inject(TranslateService);
  lang              = inject(LangService);

  private readonly staticBase =
    environment.apiUrl.replace(/\/api$/, '');

  // ── Signals ──────────────────────────────────────────────────────────────
  profile        = signal<OwnProfile | null>(null);
  pageLoading    = signal(true);
  editingBio     = signal(false);
  bioPreview     = signal<BioPreview | null>(null);
  previewLoading = signal(false);
  saveLoading    = signal(false);
  uploading      = signal(false);

  // ── Edit form state ───────────────────────────────────────────────────────
  editBio    = '';
  editTitle  = '';
  editSkills = '';

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit() { this.load(); }

  load() {
    this.pageLoading.set(true);
    this.http.get<OwnProfile>(`${environment.apiUrl}/profile`)
      .subscribe({
        next: p => {
          this.profile.set(p);
          this.pageLoading.set(false);
        },
        error: () => {
          this.pageLoading.set(false);
        }
      });
  }

  // ── Bio editing ───────────────────────────────────────────────────────────

  startEditBio() {
    const p = this.profile();
    if (!p) return;
    this.editBio    = p.bio;
    this.editTitle  = p.title;
    this.editSkills = p.skills?.join(', ') ?? '';
    this.bioPreview.set(null);
    this.editingBio.set(true);
  }

  previewBio() {
    if (!this.editBio.trim()) return;
    this.previewLoading.set(true);
    this.http.post<BioPreview>(
      `${environment.apiUrl}/profile/bio/preview`,
      { bio: this.editBio }
    ).subscribe({
      next: r => {
        this.bioPreview.set(r);
        this.previewLoading.set(false);
      },
      error: () => this.previewLoading.set(false)
    });
  }

  saveBio() {
    this.saveLoading.set(true);
    const skills = this.editSkills
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    this.http.patch<OwnProfile>(
      `${environment.apiUrl}/profile/bio`,
      { bio: this.editBio, title: this.editTitle, skills }
    ).subscribe({
      next: p => {
        this.profile.set(p);
        this.editingBio.set(false);
        this.bioPreview.set(null);
        this.saveLoading.set(false);
        this.toast.success('Profile saved', 'Your bio has been updated.');
      },
      error: () => {
        this.saveLoading.set(false);
        this.toast.error('Save failed', 'Please try again.');
      }
    });
  }

  cancelEdit() {
    this.editingBio.set(false);
    this.bioPreview.set(null);
  }

  // ── Portfolio upload ──────────────────────────────────────────────────────

  onFileSelect(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      this.toast.error('File too large', 'Maximum file size is 10MB.');
      return;
    }

    const caption = '';
    this.uploading.set(true);

    const fd = new FormData();
    fd.append('image', file);
    fd.append('caption', caption);

    this.http.post<{
      itemId:        string;
      imageUrl:      string;
      status:        string;
      humanDetected: boolean;
      message:       string;
    }>(`${environment.apiUrl}/profile/portfolio`, fd)
      .subscribe({
        next: r => {
          this.uploading.set(false);
          if (r.humanDetected) {
            this.toast.error('Image rejected', r.message);
          } else {
            this.toast.success('Image uploaded', r.message);
            this.load(); // reload to show new portfolio item
          }
          // Reset the file input
          (event.target as HTMLInputElement).value = '';
        },
        error: err => {
          this.uploading.set(false);
          this.toast.error(
            'Upload failed',
            err?.error?.message ?? 'Please try again.');
          (event.target as HTMLInputElement).value = '';
        }
      });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  resolveUrl(imageUrl: string): string {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http://') ||
        imageUrl.startsWith('https://'))
      return imageUrl;

    const stripped = imageUrl
      .replace(/^\/api\/files\//, '')
      .replace(/^\//, '');

    return `${this.staticBase}/${stripped}`;
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  getPortfolioBadge(status: string): string {
    const map: Record<string, string> = {
      Approved: 'badge-green',
      Pending:  'badge-amber',
      Rejected: 'badge-red'
    };
    return map[status] ?? 'badge-gray';
  }
}