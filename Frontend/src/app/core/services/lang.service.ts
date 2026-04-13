import { Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class LangService {
  isArabic = signal<boolean>(false);

  constructor(private translate: TranslateService) {
    const saved = localStorage.getItem('waseet-lang') || 'en';
    this.setLang(saved);
  }

  toggle() {
    this.setLang(this.isArabic() ? 'en' : 'ar');
  }

  setLang(lang: string) {
    this.isArabic.set(lang === 'ar');
    this.translate.use(lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
    localStorage.setItem('waseet-lang', lang);
  }
}