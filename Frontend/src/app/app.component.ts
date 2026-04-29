import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { ToastContainerComponent } from './shared/toast/toast-container.component';
import { LangService } from './core/services/lang.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, ToastContainerComponent, TranslateModule],
  template: `
    <app-navbar />
    <main class="min-h-screen">
      <router-outlet />
    </main>
    <app-toast-container />
  `
})
export class AppComponent implements OnInit {
  private lang = inject(LangService);
  ngOnInit() { this.lang.setLang(localStorage.getItem('waseet-lang') || 'en'); }
}