import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { ClipService } from '../services/clip.service';
import { ThemeService, Theme } from '../services/theme';
import { FormsModule } from '@angular/forms';
import { User } from 'firebase/auth';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrls: ['./settings.css']
})
export class SettingsComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  clipService = inject(ClipService);
  themeService = inject(ThemeService);

  displayName = '';
  email = '';
  password = '';
  user: User | null = null;

  ngOnInit() {
    this.authService.authState$.subscribe(user => {
      if (user) {
        this.user = user;
        this.displayName = user.displayName || '';
        this.email = user.email || '';
      }
    });
  }

  public async logout() {
    try {
      await this.authService.logout();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  toggleAdvancedClipOptions() {
    this.clipService.showAdvancedClipOptions.update(value => !value);
  }

  onThemeChange(event: Event) {
    const selectedTheme = (event.target as HTMLSelectElement).value as Theme;
    this.themeService.setTheme(selectedTheme);
  }

  onDisappearanceTimeChange(event: Event) {
    const hours = parseInt((event.target as HTMLInputElement).value, 10);
    if (!isNaN(hours) && hours > 0) {
      this.clipService.clipDisappearanceHours.set(hours);
    }
  }

  toggleShowCounts() {
    this.clipService.showCounts.update(value => !value);
  }

  toggleShowFontSelect() {
    this.clipService.showFontSelect.update(value => !value);
  }

  toggleShowFontSizeSelect() {
    this.clipService.showFontSizeSelect.update(value => !value);
  }

  async updateName() {
    if (this.user) {
      await this.authService.updateProfile({ displayName: this.displayName });
    }
  }

  async updateEmail() {
    if (this.user) {
      await this.authService.updateEmail(this.email);
    }
  }

  async updatePassword() {
    if (this.user && this.password) {
      await this.authService.updatePassword(this.password);
      this.password = '';
    }
  }

  onColorChange(event: Event, colorName: 'primary' | 'secondary' | 'accent') {
    const color = (event.target as HTMLInputElement).value;
    this.themeService.setColor(colorName, color);
  }

  resetColors() {
    this.themeService.resetColors();
  }
}
