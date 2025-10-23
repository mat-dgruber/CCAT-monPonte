import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'Normal' | 'Escuro' | 'Alto Contraste';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  theme = signal<Theme>(this.getInitialTheme());
  notebookStyle = signal<boolean>(this.getInitialNotebookStyle());

  constructor() {
    effect(() => {
      const currentTheme = this.theme();
      document.documentElement.classList.remove('dark', 'high-contrast');
      if (currentTheme === 'Escuro') {
        document.documentElement.classList.add('dark');
      } else if (currentTheme === 'Alto Contraste') {
        document.documentElement.classList.add('high-contrast');
      }
      localStorage.setItem('theme', currentTheme);
    });

    effect(() => {
      const currentNotebookStyle = this.notebookStyle();
      localStorage.setItem('notebookStyle', JSON.stringify(currentNotebookStyle));
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

  private getInitialNotebookStyle(): boolean {
    if (typeof localStorage !== 'undefined') {
      const savedNotebookStyle = localStorage.getItem('notebookStyle');
      if (savedNotebookStyle) {
        return JSON.parse(savedNotebookStyle);
      }
    }
    return false;
  }

  setTheme(theme: Theme) {
    this.theme.set(theme);
  }

  toggleNotebookStyle() {
    this.notebookStyle.update(value => !value);
  }
}
