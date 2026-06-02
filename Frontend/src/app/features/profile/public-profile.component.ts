import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface PublicProfile {
  userId: string;
  title: string;
  bio: string;
  skills: string[];
  isPublished: boolean;
  portfolio: PublicPortfolioItem[];
}

interface PublicPortfolioItem {
  itemId: string;
  imageUrl: string;
  caption: string;
  status: string;
  uploadedAt: string;
}

@Component({
  selector: 'app-public-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div class="page">
      <div class="max-w-4xl mx-auto">

        @if (loading()) {
          <div class="space-y-6">
            <div class="card p-8 animate-pulse flex gap-5">
              <div class="w-20 h-20 skeleton rounded-2xl flex-shrink-0"></div>
              <div class="flex-1 space-y-3">
                <div class="h-5 skeleton rounded w-1/3"></div>
                <div class="h-3 skeleton rounded w-1/2"></div>
                <div class="h-3 skeleton rounded w-2/3"></div>
              </div>
            </div>
            <div class="card p-6 animate-pulse">
              <div class="h-4 skeleton rounded w-1/4 mb-4"></div>
              <div class="grid grid-cols-3 gap-4">
                @for (i of [1,2,3]; track i) {
                  <div class="aspect-square skeleton rounded-2xl"></div>
                }
              </div>
            </div>
          </div>

        } @else if (error()) {
          <div class="card p-12 text-center">
            <p class="text-4xl mb-4">🔍</p>
            <p class="font-semibold text-neutral-700 dark:text-neutral-300">Profile not found</p>
            <p class="text-sm text-neutral-400 mt-2">This freelancer's profile is not available.</p>
            <a routerLink="/browse" class="btn-primary mt-6 inline-flex">Browse Tasks</a>
          </div>

        } @else if (profile()) {
          <div class="space-y-6">

            <!-- Profile header card -->
            <div class="card p-8">
              <div class="flex items-start gap-5 flex-wrap">
                <div class="avatar w-20 h-20 text-2xl font-bold flex-shrink-0">
                  {{ profile()!.title?.charAt(0)?.toUpperCase() || '?' }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-3 flex-wrap mb-2">
                    <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">
                      {{ profile()!.title || 'Freelancer' }}
                    </h1>
                    @if (profile()!.isPublished) {
                      <span class="badge-green">
                        <span class="w-1.5 h-1.5 bg-success-500 rounded-full"></span>
                        Available
                      </span>
                    }
                  </div>

                  @if (profile()!.bio) {
                    <p class="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-2xl">
                      {{ profile()!.bio }}
                    </p>
                  } @else {
                    <p class="text-sm text-neutral-400 italic">No bio provided.</p>
                  }

                  @if (profile()!.skills?.length) {
                    <div class="flex flex-wrap gap-2 mt-4">
                      @for (skill of profile()!.skills; track skill) {
                        <span class="badge-blue">{{ skill }}</span>
                      }
                    </div>
                  }
                </div>
              </div>

              <!-- Anonymity notice -->
              <div class="mt-6 pt-5 border-t border-neutral-100 dark:border-neutral-800">
                <div class="flex items-center gap-2 text-xs text-neutral-400">
                  <span>🛡</span>
                  <span>Identity is protected — contact is only available through task proposals.</span>
                </div>
              </div>
            </div>

            <!-- Portfolio -->
            @if (approvedPortfolio().length > 0) {
              <div class="card p-6">
                <h2 class="text-lg font-semibold text-neutral-900 dark:text-white mb-5">
                  Portfolio
                  <span class="text-sm font-normal text-neutral-400 ms-2">
                    {{ approvedPortfolio().length }}
                    work{{ approvedPortfolio().length !== 1 ? 's' : '' }}
                  </span>
                </h2>

                <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  @for (item of approvedPortfolio(); track item.itemId) {
                    <div
                      class="relative group rounded-2xl overflow-hidden aspect-square
                             bg-neutral-100 dark:bg-neutral-800 cursor-pointer"
                      (click)="openImage(item)">

                      <img
                        [src]="resolveUrl(item.imageUrl)"
                        [alt]="item.caption || 'Portfolio image'"
                        class="w-full h-full object-cover transition-transform
                               duration-300 group-hover:scale-105"
                        loading="lazy"
                        (error)="onImgError($event)" />

                      @if (item.caption) {
                        <div class="absolute inset-0 bg-gradient-to-t from-black/60
                                    via-transparent to-transparent opacity-0
                                    group-hover:opacity-100 transition-opacity
                                    flex items-end p-3">
                          <p class="text-white text-xs font-medium line-clamp-2">
                            {{ item.caption }}
                          </p>
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            } @else {
              <div class="card p-8 text-center">
                <p class="text-3xl mb-3">🖼</p>
                <p class="text-sm text-neutral-400">No portfolio items yet.</p>
              </div>
            }

          </div>
        }

      </div>
    </div>

    <!-- Lightbox -->
    @if (lightboxImage()) {
      <div
        class="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
        (click)="lightboxImage.set(null)">
        <div class="relative max-w-4xl max-h-full"
          (click)="$event.stopPropagation()">
          <img
            [src]="resolveUrl(lightboxImage()!.imageUrl)"
            [alt]="lightboxImage()!.caption"
            class="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
          @if (lightboxImage()!.caption) {
            <p class="text-white text-sm text-center mt-3 opacity-80">
              {{ lightboxImage()!.caption }}
            </p>
          }
          <button
            (click)="lightboxImage.set(null)"
            class="absolute -top-3 -end-3 w-8 h-8 bg-white dark:bg-neutral-800
                   rounded-full flex items-center justify-center text-neutral-700
                   dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700
                   shadow-lg transition-colors text-sm font-bold">
            ✕
          </button>
        </div>
      </div>
    }
  `
})
export class PublicProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http  = inject(HttpClient);

  profile       = signal<PublicProfile | null>(null);
  loading       = signal(true);
  error         = signal(false);
  lightboxImage = signal<PublicPortfolioItem | null>(null);

  // Base URL for static files — strips /api from the apiUrl
  // e.g. "http://localhost:5294/api" → "http://localhost:5294"
  private readonly staticBase = environment.apiUrl.replace(/\/api$/, '');

  approvedPortfolio = () =>
    this.profile()?.portfolio?.filter(i => i.status === 'Approved') ?? [];

  ngOnInit() {
    const userId = this.route.snapshot.paramMap.get('userId');
    if (!userId) { this.error.set(true); this.loading.set(false); return; }

    this.http.get<PublicProfile>(
      `${environment.apiUrl}/profile/${userId}/public`
    ).subscribe({
      next:  p => { this.profile.set(p);   this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); }
    });
  }

  /**
   * Resolves any imageUrl format to an absolute URL:
   *  - already absolute:  "http://localhost:5294/kyc-docs/x.png" → unchanged
   *  - root-relative:     "/kyc-docs/x.png" → "http://localhost:5294/kyc-docs/x.png"
   *  - api-prefixed:      "/api/files/kyc-docs/x.png" → "http://localhost:5294/kyc-docs/x.png"
   *  - bare path:         "kyc-docs/x.png" → "http://localhost:5294/kyc-docs/x.png"
   */
  resolveUrl(imageUrl: string): string {
    if (!imageUrl) return '';

    // Already a full URL — return as-is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))
      return imageUrl;

    // Strip legacy "/api/files/" prefix if present
    const stripped = imageUrl.replace(/^\/api\/files\//, '');

    // Ensure single leading slash and combine with static base
    const path = stripped.startsWith('/') ? stripped : `/${stripped}`;
    return `${this.staticBase}${path}`;
  }

  onImgError(event: Event): void {
    // Replace broken image with a placeholder
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  openImage(item: PublicPortfolioItem): void {
    this.lightboxImage.set(item);
  }
}