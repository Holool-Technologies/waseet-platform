import { Component, inject, OnInit, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { ToastContainerComponent } from './shared/toast/toast-container.component';
import { LangService } from './core/services/lang.service';
import { AuthService } from './core/services/auth.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, ToastContainerComponent,
            CommonModule, TranslateModule],
  template: `
    @if (!isAdmin()) {
      <app-navbar />
    }
    <main [class]="isAdmin() ? '' : 'min-h-screen'">
      <router-outlet />
    </main>
    <app-toast-container />
  `
})
export class AppComponent implements OnInit {
  private lang  = inject(LangService);
  private auth  = inject(AuthService);

  isAdmin = computed(() => this.auth.currentUser()?.role === 99);

  ngOnInit() {
    this.lang.setLang(localStorage.getItem('waseet-lang') || 'en');
  }
}