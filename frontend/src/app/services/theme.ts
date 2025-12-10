import { Injectable, signal, effect, inject } from '@angular/core';
import { Firestore, doc, onSnapshot, setDoc, getDoc, Unsubscribe } from '@angular/fire/firestore';
import { AuthService } from './auth';
import { Subscription } from 'rxjs';

export type Theme = 'Normal' | 'Escuro' | 'Alto Contraste' | 'CapyCro';
export type FontFamily = 'sans' | 'serif' | 'mono';

@Injectable({
  providedIn: 'root'
})
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
    // Load initial state from localStorage immediately
    this.loadFromLocalStorage();

    this.subscribeToUser();
    this.setupThemeEffect();
    this.setupFontEffect();
  }

  private loadFromLocalStorage() {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme;
      if (savedTheme) {
        this.theme.set(savedTheme);
      } else {
        this.theme.set(this.getInitialTheme());
      }

      const savedNotebookStyle = localStorage.getItem('notebookStyle');
      if (savedNotebookStyle !== null) {
        this.notebookStyle.set(savedNotebookStyle === 'true');
      }

      const savedFontFamily = localStorage.getItem('fontFamily') as FontFamily;
      if (savedFontFamily) {
        this.fontFamily.set(savedFontFamily);
      }

      const savedFontSize = localStorage.getItem('fontSize');
      if (savedFontSize) {
        this.fontSize.set(parseInt(savedFontSize, 10));
      }
    }
  }

  private subscribeToUser(): void {
    this.userSubscription = this.authService.authState$.subscribe(user => {
      if (user) {
        this.subscribeToSettings(user.uid);
      }
      // removing usage of cleanup/resetToDefault so we keep local preferences if logout happens
      // or we could decide to keep them until a new user logs in
    });
  }

  private async subscribeToSettings(userId: string): Promise<void> {
    this.cleanupSubscriptions();
    const docRef = doc(this.firestore, `user_settings/${userId}`);

    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      // If no settings exist remote, create them with current local values
      const initialSettings = {
        theme: this.theme(),
        notebookStyle: this.notebookStyle(),
        fontFamily: this.fontFamily(),
        fontSize: this.fontSize()
      };
      await setDoc(docRef, initialSettings);
    }

    // Listen for real-time updates from Firestore and sync to local
    this.settingsSubscription = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const newTheme = data['theme'] as Theme || 'Normal';
        const newNotebookStyle = data['notebookStyle'] || false;
        const newFontFamily = data['fontFamily'] as FontFamily || 'sans';
        const newFontSize = data['fontSize'] || 16;

        // Update signals
        this.theme.set(newTheme);
        this.notebookStyle.set(newNotebookStyle);
        this.fontFamily.set(newFontFamily);
        this.fontSize.set(newFontSize);

        // Update localStorage to stay in sync
        this.saveToLocalStorage('theme', newTheme);
        this.saveToLocalStorage('notebookStyle', String(newNotebookStyle));
        this.saveToLocalStorage('fontFamily', newFontFamily);
        this.saveToLocalStorage('fontSize', String(newFontSize));
      }
    });
  }

  private setupThemeEffect(): void {
    effect(() => {
      const currentTheme = this.theme();
      document.documentElement.classList.remove('dark', 'high-contrast', 'capycro');
      if (currentTheme === 'Escuro') {
        document.documentElement.classList.add('dark');
      } else if (currentTheme === 'Alto Contraste') {
        document.documentElement.classList.add('high-contrast');
      } else if (currentTheme === 'CapyCro') {
        document.documentElement.classList.add('capycro');
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

  private saveToLocalStorage(key: string, value: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
  }

  private async updateSetting(setting: { [key: string]: any }): Promise<void> {
    // Update local state first for immediate feedback
    Object.keys(setting).forEach(key => {
        this.saveToLocalStorage(key, String(setting[key]));
    });

    const userId = this.authService.getCurrentUserId();
    if (!userId) return;
    const docRef = doc(this.firestore, `user_settings/${userId}`);
    await setDoc(docRef, setting, { merge: true });
  }

  setTheme(theme: Theme) {
    this.theme.set(theme);
    this.saveToLocalStorage('theme', theme); // Immediate local save
    this.updateSetting({ theme });
  }

  toggleNotebookStyle() {
    const newStyle = !this.notebookStyle();
    this.notebookStyle.set(newStyle);
    this.saveToLocalStorage('notebookStyle', String(newStyle)); // Immediate local save
    this.updateSetting({ notebookStyle: newStyle });
  }

  setFontFamily(fontFamily: FontFamily) {
    this.fontFamily.set(fontFamily);
    this.saveToLocalStorage('fontFamily', fontFamily); // Immediate local save
    this.updateSetting({ fontFamily });
  }

  setFontSize(fontSize: number) {
    this.fontSize.set(fontSize);
    this.saveToLocalStorage('fontSize', String(fontSize)); // Immediate local save
    this.updateSetting({ fontSize });
  }

  private resetToDefaults(): void {
    const initialTheme = this.getInitialTheme();
    this.theme.set(initialTheme);
    this.saveToLocalStorage('theme', initialTheme);

    this.notebookStyle.set(false);
    this.saveToLocalStorage('notebookStyle', 'false');

    this.fontFamily.set('sans');
    this.saveToLocalStorage('fontFamily', 'sans');

    this.fontSize.set(16);
    this.saveToLocalStorage('fontSize', '16');
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
