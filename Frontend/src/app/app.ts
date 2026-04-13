import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { LangService } from './core/services/lang.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, TranslateModule],
  template: `
    <app-navbar />
    <main class="min-h-screen">
      <router-outlet />
    </main>
  `
})
export class AppComponent implements OnInit {
  private lang = inject(LangService);
  ngOnInit() { this.lang.setLang(localStorage.getItem('waseet-lang') || 'en'); }
}