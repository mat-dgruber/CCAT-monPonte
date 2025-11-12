import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { HeaderComponent } from './header/header';
import { FooterComponent } from './footer/footer';
import { ToastNotificationComponent } from '../toast-notification/toast-notification';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, ToastNotificationComponent],
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class LayoutComponent implements OnInit, OnDestroy {
  isSidebarCollapsed = signal(false);
  private router = inject(Router);
  private routerSub: Subscription | null = null;

  ngOnInit() {
    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(event => {
      if ((event as NavigationEnd).url.includes('/notes/')) {
        this.isSidebarCollapsed.set(true);
      }
    });
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
  }

  toggleSidebar() {
    this.isSidebarCollapsed.set(!this.isSidebarCollapsed());
  }
}
