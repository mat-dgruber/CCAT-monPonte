import { Component, inject, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth';
import { ResponsiveService } from './services/responsive';
import { ThemeService } from './services/theme';
import { Observable } from 'rxjs';
import { User } from 'firebase/auth';

@Component({
  selector: 'app-root',
  standalone: true, // standalone já estava, mantemos
  imports: [
    RouterOutlet,
    CommonModule  // Adicionado para a diretiva @if e o pipe async
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {
  private authService = inject(AuthService);
  private responsiveService = inject(ResponsiveService);
  private themeService = inject(ThemeService); // Ensure ThemeService starts immediately
  authState$: Observable<User | null> = this.authService.authState$;

  constructor() {
    this.responsiveService.setIsMobile(window.innerWidth < 768);
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.responsiveService.setIsMobile(window.innerWidth < 768);
  }

  async logout() {
    await this.authService.logout();
  }
}
