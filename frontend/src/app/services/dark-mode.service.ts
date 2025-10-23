import { Injectable, signal, WritableSignal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DarkModeService {
  isDarkMode: WritableSignal<boolean>;
  private readonly DARK_MODE_KEY = 'darkMode';

  constructor() {
    // Inicializa a partir do localStorage ou da preferência do sistema
    const savedMode = localStorage.getItem(this.DARK_MODE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.isDarkMode = signal(savedMode === 'true' || (savedMode === null && prefersDark));

    // Aplica o estado inicial
    this.applyDarkMode(this.isDarkMode());

    // Ouve por mudanças na preferência do sistema (se não houver preferência explícita do usuário)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
      if (localStorage.getItem(this.DARK_MODE_KEY) === null) {
        this.isDarkMode.set(event.matches);
        this.applyDarkMode(event.matches);
      }
    });
  }

  toggleDarkMode(): void {
    this.isDarkMode.update(currentMode => {
      const newMode = !currentMode;
      localStorage.setItem(this.DARK_MODE_KEY, String(newMode));
      this.applyDarkMode(newMode);
      return newMode;
    });
  }

  private applyDarkMode(enabled: boolean): void {
    if (enabled) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}