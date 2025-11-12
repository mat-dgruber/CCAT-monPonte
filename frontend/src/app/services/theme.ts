import { Injectable, signal, effect, inject } from '@angular/core';
import { Firestore, doc, onSnapshot, setDoc, getDoc, Unsubscribe } from '@angular/fire/firestore';
import { AuthService } from './auth';
import { Subscription } from 'rxjs';

export type Theme = 'Normal' | 'Escuro' | 'Alto Contraste';
export type FontFamily = 'sans' | 'serif' | 'mono';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  // Signals for theme and editor styles
  theme = signal<Theme>('Normal');
  notebookStyle = signal<boolean>(false);
  fontFamily = signal<FontFamily>('sans');
  fontSize = signal<number>(16);

  private userSubscription: Subscription | null = null;
  private settingsSubscription: Unsubscribe | null = null;

  constructor() {
    this.subscribeToUser();
    this.setupThemeEffect();
    this.setupFontEffect();
  }

  private subscribeToUser(): void {
    this.userSubscription = this.authService.authState$.subscribe(user => {
      if (user) {
        this.subscribeToSettings(user.uid);
      } else {
        this.cleanup();
        this.resetToDefaults();
      }
    });
  }

  private async subscribeToSettings(userId: string): Promise<void> {
    this.cleanupSubscriptions();
    const docRef = doc(this.firestore, `user_settings/${userId}`);

    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      // If no settings exist, create them with initial values
      const initialSettings = {
        theme: this.getInitialTheme(),
        notebookStyle: this.getInitialNotebookStyle(),
        fontFamily: 'sans',
        fontSize: 16
      };
      await setDoc(docRef, initialSettings);
    }

    // Listen for real-time updates
    this.settingsSubscription = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        this.theme.set(data['theme'] as Theme || 'Normal');
        this.notebookStyle.set(data['notebookStyle'] || false);
        this.fontFamily.set(data['fontFamily'] as FontFamily || 'sans');
        this.fontSize.set(data['fontSize'] || 16);
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

  private setupFontEffect(): void {
    effect(() => {
        const family = this.fontFamily();
        const size = this.fontSize();
        document.documentElement.style.setProperty('--font-family', `var(--font-${family})`);
        document.documentElement.style.setProperty('--font-size', `${size}px`);
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

  setFontFamily(fontFamily: FontFamily) {
    this.fontFamily.set(fontFamily);
    this.updateSetting({ fontFamily });
  }

  setFontSize(fontSize: number) {
    this.fontSize.set(fontSize);
    this.updateSetting({ fontSize });
  }

  private resetToDefaults(): void {
    this.theme.set(this.getInitialTheme());
    this.notebookStyle.set(this.getInitialNotebookStyle());
    this.fontFamily.set('sans');
    this.fontSize.set(16);
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
