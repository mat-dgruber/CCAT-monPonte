import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  isDarkMode = signal<boolean>(this.getInitialDarkMode());

  constructor() {
    effect(() => {
      const isDark = this.isDarkMode();
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('darkMode', JSON.stringify(isDark));
    });
  }

  private getInitialDarkMode(): boolean {
    if (typeof localStorage !== 'undefined') {
      const savedMode = localStorage.getItem('darkMode');
      if (savedMode) {
        return JSON.parse(savedMode);
      }
    }
    if (typeof window !== 'undefined') {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }

  toggleDarkMode() {
    this.isDarkMode.update(value => !value);
  }
}
