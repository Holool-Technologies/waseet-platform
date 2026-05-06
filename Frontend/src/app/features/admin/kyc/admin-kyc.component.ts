import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AdminService } from '../../../core/services/admin.service';
import { AdminKyc, AdminPaged } from '../../../core/models/admin.models';
import { AdminTableComponent } from '../shared/admin-table.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-admin-kyc',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminTableComponent],
  template: `
    <div class="space-y-5">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="section-title">قائمة انتظار التحقق من الهوية</h1>
          <p class="section-sub">مراجعة وثائق هوية المستخدمين والموافقة عليها أو رفضها</p>
        </div>
        <div class="flex gap-2">
          @for (s of statuses; track s.value) {
            <button (click)="filterStatus = s.value; page = 1; load()"
              [class]="filterStatus === s.value
                ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'">
              {{ s.label }}
            </button>
          }
        </div>
      </div>

      <!-- KYC cards — better than table for document review -->
      @if (loading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          @for (i of [1,2]; track i) {
            <div class="card p-5 animate-pulse">
              <div class="h-40 skeleton rounded-xl mb-3"></div>
              <div class="h-3 skeleton rounded w-2/3 mb-2"></div>
              <div class="h-3 skeleton rounded w-1/2"></div>
            </div>
          }
        </div>
      } @else if ((result()?.items ?? []).length === 0) {
        <div class="card p-12 text-center">
          <p class="text-4xl mb-3">✓</p>
          <p class="font-semibold text-neutral-700 dark:text-neutral-300">القائمة فارغة!</p>
          <p class="text-sm text-neutral-400 mt-1">تمت مراجعة جميع الطلبات</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          @for (kyc of result()!.items; track kyc.kycId) {
            <div class="card overflow-hidden">
              <!-- Document preview -->
              <div class="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-100 dark:border-neutral-800 p-3">
                <div class="flex items-center justify-between mb-2">
                  <p class="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    وثيقة الهوية
                  </p>
                  <a [href]="getDocUrl(kyc.documentBlobRef)"
                     target="_blank"
                     class="text-xs text-brand-600 hover:underline flex items-center gap-1">
                    فتح في تبويب جديد ↗
                  </a>
                </div>

                <!-- Image preview -->
                @if (isImage(kyc.documentBlobRef)) {
                  <div class="relative rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-900"
                    style="height: 200px">
                    <img
                      [src]="getDocUrl(kyc.documentBlobRef)"
                      alt="Identity document"
                      class="w-full h-full object-contain cursor-pointer"
                      (click)="openLightbox(kyc)"
                      (error)="onImgError($event)" />
                    <div class="absolute bottom-2 end-2">
                      <button (click)="openLightbox(kyc)"
                        class="btn-secondary btn-sm text-xs px-2 py-1">
                        🔍 تكبير
                      </button>
                    </div>
                  </div>
                }

                <!-- PDF preview -->
                @if (isPdf(kyc.documentBlobRef)) {
                  <div class="rounded-xl overflow-hidden bg-neutral-100" style="height:200px">
                    <iframe
                      [src]="getSafePdfUrl(kyc.documentBlobRef)"
                      class="w-full h-full"
                      frameborder="0"
                      title="Identity document PDF">
                    </iframe>
                  </div>
                }
              </div>

              <!-- User info + actions -->
              <div class="p-5">
                <div class="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p class="font-semibold text-neutral-900 dark:text-white">
                      {{ kyc.userEmail }}
                    </p>
                    <div class="flex items-center gap-2 mt-1">
                      <span [class]="getStatusBadge(kyc.status)">{{ getStatusLabel(kyc.status) }}</span>
                      <span class="text-xs text-neutral-400">
                        {{ kyc.submittedAt | date:'d MMM yyyy, HH:mm' }}
                      </span>
                    </div>
                  </div>
                </div>

                @if (kyc.status === 'Pending') {
                  <div class="flex gap-2">
                    <button (click)="decide(kyc, 'approve')"
                      [disabled]="deciding[kyc.kycId]"
                      class="btn-primary btn-sm flex-1">
                      @if (deciding[kyc.kycId] === 'approve') {
                        <span class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      }
                      ✓ موافقة
                    </button>
                    <button (click)="decide(kyc, 'reject')"
                      [disabled]="deciding[kyc.kycId]"
                      class="btn-danger btn-sm flex-1">
                      @if (deciding[kyc.kycId] === 'reject') {
                        <span class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      }
                      ✕ رفض
                    </button>
                  </div>
                } @else {
                  <div class="text-center text-sm text-neutral-400 py-2">
                    تمت المراجعة في {{ kyc.verifiedAt | date:'d MMM yyyy' }}
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <!-- Pagination -->
        @if ((result()?.totalPages ?? 1) > 1) {
          <div class="flex justify-center gap-2">
            <button (click)="page = page - 1; load()" [disabled]="page === 1" class="btn-secondary btn-sm">← السابق</button>
            <span class="btn-ghost btn-sm">{{ page }} / {{ result()?.totalPages }}</span>
            <button (click)="page = page + 1; load()" [disabled]="page === result()?.totalPages" class="btn-secondary btn-sm">التالي →</button>
          </div>
        }
      }
    </div>

    <!-- Lightbox -->
    @if (lightboxKyc()) {
      <div class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
        (click)="lightboxKyc.set(null)">
        <div class="relative max-w-2xl w-full" (click)="$event.stopPropagation()">
          <img [src]="getDocUrl(lightboxKyc()!.documentBlobRef)"
            alt="Identity document"
            class="w-full rounded-2xl shadow-2xl" />
          <button (click)="lightboxKyc.set(null)"
            class="absolute -top-3 -end-3 w-8 h-8 bg-white rounded-full flex items-center justify-center text-neutral-700 shadow-lg font-bold">
            ✕
          </button>
        </div>
      </div>
    }
  `
})
export class AdminKycComponent implements OnInit {
  private adminService = inject(AdminService);
  private sanitizer    = inject(DomSanitizer);

  result       = signal<AdminPaged<AdminKyc> | null>(null);
  loading      = signal(true);
  lightboxKyc  = signal<AdminKyc | null>(null);
  page         = 1;
  filterStatus = 'Pending';
  deciding: Record<string, string> = {};

  statuses = [
    { value: 'Pending',  label: 'قيد الانتظار' },
    { value: 'Approved', label: 'مقبول' },
    { value: 'Rejected', label: 'مرفوض' },
  ];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.adminService.getKycQueue(this.page, 10, this.filterStatus).subscribe({
      next: r => { this.result.set(r); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  decide(kyc: AdminKyc, decision: 'approve' | 'reject') {
    this.deciding[kyc.kycId] = decision;
    this.adminService.decideKyc(kyc.kycId, decision).subscribe({
      next: () => { this.deciding[kyc.kycId] = ''; this.load(); },
      error: () => { this.deciding[kyc.kycId] = ''; }
    });
  }

  getDocUrl(blobRef: string): string {

    return `${environment.apiUrl.replace('/api', '')}/${blobRef}`;
  }

  getSafePdfUrl(blobRef: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.getDocUrl(blobRef));
  }

  isImage(ref: string): boolean {
    return /\.(jpg|jpeg|png|webp)$/i.test(ref);
  }

  isPdf(ref: string): boolean {
    return /\.pdf$/i.test(ref);
  }

  openLightbox(kyc: AdminKyc) { this.lightboxKyc.set(kyc); }

  onImgError(e: Event) {
    (e.target as HTMLImageElement).style.display = 'none';
  }

  getStatusBadge(s: string) {
    return { Pending: 'badge-amber', Approved: 'badge-green', Rejected: 'badge-red' }[s] ?? 'badge-gray';
  }

  getStatusLabel(s: string) {
    return { Pending: 'قيد المراجعة', Approved: 'مقبول', Rejected: 'مرفوض' }[s] ?? s;
  }
}