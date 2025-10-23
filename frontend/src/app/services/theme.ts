import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'Normal' | 'Escuro' | 'Caderno';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  theme = signal<Theme>(this.getInitialTheme());
  primaryColor = signal<string>(this.getInitialColor('primary', '#ffffff'));
  secondaryColor = signal<string>(this.getInitialColor('secondary', '#f8fafc'));
  accentColor = signal<string>(this.getInitialColor('accent', '#3b82f6'));

  constructor() {
    effect(() => {
      const currentTheme = this.theme();
      document.documentElement.classList.remove('dark', 'notebook-theme');
      if (currentTheme === 'Escuro') {
        document.documentElement.classList.add('dark');
      } else if (currentTheme === 'Caderno') {
        document.documentElement.classList.add('notebook-theme');
      }
      localStorage.setItem('theme', currentTheme);

      document.documentElement.style.setProperty('--primary-color', this.primaryColor());
      document.documentElement.style.setProperty('--secondary-color', this.secondaryColor());
      document.documentElement.style.setProperty('--accent-color', this.accentColor());

      localStorage.setItem('primaryColor', this.primaryColor());
      localStorage.setItem('secondaryColor', this.secondaryColor());
      localStorage.setItem('accentColor', this.accentColor());
    });
  }

  private getInitialTheme(): Theme {
    if (typeof localStorage !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        return savedTheme as Theme;
      }
    }
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'Escuro';
    }
    return 'Normal';
  }

  private getInitialColor(name: string, defaultColor: string): string {
    if (typeof localStorage !== 'undefined') {
      const savedColor = localStorage.getItem(`${name}Color`);
      if (savedColor) {
        return savedColor;
      }
    }
    return defaultColor;
  }

  setTheme(theme: Theme) {
    this.theme.set(theme);
  }

  setColor(name: 'primary' | 'secondary' | 'accent', color: string) {
    this[`${name}Color`].set(color);
  }

  resetColors() {
    this.primaryColor.set('#ffffff');
    this.secondaryColor.set('#f8fafc');
    this.accentColor.set('#3b82f6');
  }
}
