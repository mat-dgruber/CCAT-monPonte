import { Injectable, signal, effect, inject } from '@angular/core';
import { Firestore, doc, onSnapshot, setDoc, getDoc, Unsubscribe } from '@angular/fire/firestore';
import { AuthService } from './auth';
import { Subscription } from 'rxjs';

export type Theme = 'Normal' | 'Escuro' | 'Alto Contraste';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  theme = signal<Theme>('Normal');
  notebookStyle = signal<boolean>(false);

  private userSubscription: Subscription | null = null;
  private settingsSubscription: Unsubscribe | null = null;

  constructor() {
    this.subscribeToUser();
    this.setupThemeEffect();
  }

  private subscribeToUser(): void {
    this.userSubscription = this.authService.authState$.subscribe(user => {
      if (user) {
        this.subscribeToSettings(user.uid);
      } else {
        this.cleanup();
        this.resetToDefaultTheme();
      }
    });
  }

  private async subscribeToSettings(userId: string): Promise<void> {
    this.cleanupSubscriptions();
    const docRef = doc(this.firestore, `user_settings/${userId}`);

    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      const initialSettings = {
        theme: this.getInitialTheme(),
        notebookStyle: this.getInitialNotebookStyle()
      };
      await setDoc(docRef, initialSettings);
    }

    this.settingsSubscription = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        this.theme.set(data['theme'] as Theme || 'Normal');
        this.notebookStyle.set(data['notebookStyle'] || false);
      }
    });
  }

  private setupThemeEffect(): void {
    effect(() => {
      const currentTheme = this.theme();
      document.documentElement.classList.remove('dark', 'high-contrast');
      if (currentTheme === 'Escuro') {
        document.documentElement.classList.add('dark');
      } else if (currentTheme === 'Alto Contraste') {
        document.documentElement.classList.add('high-contrast');
      }
    });
  }

  private getInitialTheme(): Theme {
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'Escuro';
    }
    return 'Normal';
  }

  private getInitialNotebookStyle(): boolean {
    return false;
  }

  private async updateSetting(setting: { [key: string]: any }): Promise<void> {
    const userId = this.authService.getCurrentUserId();
    if (!userId) return;
    const docRef = doc(this.firestore, `user_settings/${userId}`);
    await setDoc(docRef, setting, { merge: true });
  }

  setTheme(theme: Theme) {
    this.theme.set(theme);
    this.updateSetting({ theme });
  }

  toggleNotebookStyle() {
    const newStyle = !this.notebookStyle();
    this.notebookStyle.set(newStyle);
    this.updateSetting({ notebookStyle: newStyle });
  }

  private resetToDefaultTheme(): void {
    this.theme.set(this.getInitialTheme());
    this.notebookStyle.set(this.getInitialNotebookStyle());
  }

  private cleanupSubscriptions(): void {
    this.settingsSubscription?.();
    this.settingsSubscription = null;
  }

  private cleanup(): void {
    this.cleanupSubscriptions();
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
    this.cleanup();
  }
}
