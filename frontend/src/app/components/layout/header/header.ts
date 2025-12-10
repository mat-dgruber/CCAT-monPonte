import { Component, inject, signal, WritableSignal } from '@angular/core';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth';
import { PwaService } from '../../../services/pwa.service';
import { Observable } from 'rxjs'; 
import { User } from 'firebase/auth';
import { LucideAngularModule } from 'lucide-angular';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule, RouterModule, ClickOutsideDirective],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class HeaderComponent {
  private authService = inject(AuthService);
  private pwaService = inject(PwaService);
  private router = inject(Router);
  public authState$: Observable<User | null> = this.authService.authState$;
  isMobileMenuOpen: WritableSignal<boolean> = signal(false);
  isUserMenuOpen: WritableSignal<boolean> = signal(false);

  toggleMobileMenu() {
    this.isMobileMenuOpen.set(!this.isMobileMenuOpen());
  }

  closeMobileMenu() {
    this.isMobileMenuOpen.set(false);
  }

  // PWA via Service
  installPrompt = this.pwaService.installPrompt;

  async installApp() {
    await this.pwaService.installApp();
    this.closeUserMenu();
    this.closeMobileMenu();
  }

  toggleUserMenu() {
    this.isUserMenuOpen.set(!this.isUserMenuOpen());
  }

  closeUserMenu() {
    this.isUserMenuOpen.set(false);
  }

  getInitials(user: User | null): string {
    if (!user) return '';
    const displayName = user.displayName;
    if (displayName) {
      const names = displayName.split(' ');
      const initials = names.map(n => n[0]).join('');
      return initials.slice(0, 2).toUpperCase();
    }
    const email = user.email;
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return '';
  }

  getGreetingName(user: User | null): string {
    if (!user) return '';
    if (user.displayName) {
      return user.displayName.split(' ')[0];
    }
    return user.email || '';
  }

  async logout(): Promise<void> {
    this.closeUserMenu();
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}
