import { Injectable, signal, WritableSignal, inject, computed } from '@angular/core';
import { Firestore, doc, onSnapshot, setDoc, getDoc, Unsubscribe, DocumentReference, Timestamp } from '@angular/fire/firestore';
import { AuthService } from './auth';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ClipService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  private clipDocRef: DocumentReference | null = null;
  private settingsDocRef: DocumentReference | null = null;
  private clipSnapshotSubscription: Unsubscribe | null = null;
  private settingsSnapshotSubscription: Unsubscribe | null = null;
  private userSubscription: Subscription | null = null;
  private textChangeSubject = new Subject<string>();
  private textChangeSubscription: Subscription | null = null;

  copyText: WritableSignal<string> = signal('');
  showAdvancedClipOptions: WritableSignal<boolean> = signal(false);
  selectedFont: WritableSignal<string> = signal("'Courier Prime', monospace");
  selectedFontSize: WritableSignal<string> = signal('16px');
  clipDisappearanceHours: WritableSignal<number> = signal(1);
  showCounts: WritableSignal<boolean> = signal(true);
  showFontSelect: WritableSignal<boolean> = signal(true);
  showFontSizeSelect: WritableSignal<boolean> = signal(true);

  characterCount = computed(() => this.copyText().length);
  wordCount = computed(() => {
    const text = this.copyText().trim();
    return text === '' ? 0 : text.split(/\s+/).length;
  });

  constructor() {
    this.subscribeToUser();
    this.setupTextChangeSubscription();
  }

  private subscribeToUser(): void {
    this.userSubscription = this.authService.authState$.subscribe(user => {
      if (user) {
        this.clipDocRef = doc(this.firestore, `clip/${user.uid}`);
        this.settingsDocRef = doc(this.firestore, `user_settings/${user.uid}`);
        this.subscribeToClipSnapshot();
        this.subscribeToSettingsSnapshot();
      } else {
        this.cleanup();
        this.resetToDefaults();
      }
    });
  }

  private async subscribeToSettingsSnapshot(): Promise<void> {
    if (this.settingsSnapshotSubscription) this.settingsSnapshotSubscription();

    const docSnap = await getDoc(this.settingsDocRef!);
    if (!docSnap.exists() || !docSnap.data()?.['clipSettings']) {
      await this.updateSettings({
        showAdvancedClipOptions: this.showAdvancedClipOptions(),
        selectedFont: this.selectedFont(),
        selectedFontSize: this.selectedFontSize(),
        clipDisappearanceHours: this.clipDisappearanceHours(),
        showCounts: this.showCounts(),
        showFontSelect: this.showFontSelect(),
        showFontSizeSelect: this.showFontSizeSelect(),
      });
    }

    this.settingsSnapshotSubscription = onSnapshot(this.settingsDocRef!, (docSnap) => {
      if (docSnap.metadata.hasPendingWrites) return;

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data['clipSettings']) {
          const settings = data['clipSettings'];
          this.showAdvancedClipOptions.set(settings.showAdvancedClipOptions ?? false);
          this.selectedFont.set(settings.selectedFont ?? "'Courier Prime', monospace");
          this.selectedFontSize.set(settings.selectedFontSize ?? '16px');
          this.clipDisappearanceHours.set(settings.clipDisappearanceHours ?? 1);
          this.showCounts.set(settings.showCounts ?? true);
          this.showFontSelect.set(settings.showFontSelect ?? true);
          this.showFontSizeSelect.set(settings.showFontSizeSelect ?? true);
        }
      }
    });
  }

  private subscribeToClipSnapshot(): void {
    if (this.clipSnapshotSubscription) this.clipSnapshotSubscription();
    this.clipSnapshotSubscription = onSnapshot(this.clipDocRef!, (docSnap) => {
      if (docSnap.metadata.hasPendingWrites) return;

      if (docSnap.exists()) {
        const data = docSnap.data();
        const text = data['text'] ?? '';
        const expiresAt = data['expiresAt'] as Timestamp | undefined;

        if (expiresAt && new Date() > expiresAt.toDate()) {
          this.copyText.set('');
        } else {
          this.copyText.set(text);
        }
      } else {
        this.copyText.set('');
      }
    });
  }

  private setupTextChangeSubscription(): void {
    this.textChangeSubscription = this.textChangeSubject
      .pipe(debounceTime(500))
      .subscribe(text => this.saveClip(text));
  }

  private async updateSettings(newSettings: any): Promise<void> {
    if (!this.settingsDocRef) return;
    try {
      const currentSettings = (await getDoc(this.settingsDocRef)).data()?.['clipSettings'] || {};
      const mergedSettings = { ...currentSettings, ...newSettings };
      await setDoc(this.settingsDocRef, { clipSettings: mergedSettings }, { merge: true });
    } catch (error) {
      console.error('Error saving clip settings:', error);
    }
  }

  onTextChange(text: string): void {
    this.copyText.set(text);
    this.textChangeSubject.next(text);
  }

  async saveClip(text: string): Promise<void> {
    if (!this.clipDocRef) return;

    try {
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + this.clipDisappearanceHours());
      await setDoc(this.clipDocRef, { text, expiresAt: Timestamp.fromDate(expirationDate) });
    } catch (error) {
      console.error('Error saving document:', error);
    }
  }

  setShowAdvancedClipOptions(value: boolean) {
    this.showAdvancedClipOptions.set(value);
    this.updateSettings({ showAdvancedClipOptions: value });
  }

  setSelectedFont(font: string) {
    this.selectedFont.set(font);
    this.updateSettings({ selectedFont: font });
  }

  setSelectedFontSize(size: string) {
    this.selectedFontSize.set(size);
    this.updateSettings({ selectedFontSize: size });
  }

  setClipDisappearanceHours(hours: number) {
    this.clipDisappearanceHours.set(hours);
    this.updateSettings({ clipDisappearanceHours: hours });
  }

  setShowCounts(value: boolean) {
    this.showCounts.set(value);
    this.updateSettings({ showCounts: value });
  }

  setShowFontSelect(value: boolean) {
    this.showFontSelect.set(value);
    this.updateSettings({ showFontSelect: value });
  }

  setShowFontSizeSelect(value: boolean) {
    this.showFontSizeSelect.set(value);
    this.updateSettings({ showFontSizeSelect: value });
  }

  private cleanup(): void {
    this.clipSnapshotSubscription?.();
    this.settingsSnapshotSubscription?.();
    this.clipSnapshotSubscription = null;
    this.settingsSnapshotSubscription = null;
    this.clipDocRef = null;
    this.settingsDocRef = null;
    this.copyText.set('');
  }

  private resetToDefaults(): void {
    this.showAdvancedClipOptions.set(false);
    this.selectedFont.set("'Courier Prime', monospace");
    this.selectedFontSize.set('16px');
    this.clipDisappearanceHours.set(1);
    this.showCounts.set(true);
    this.showFontSelect.set(true);
    this.showFontSizeSelect.set(true);
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
    this.textChangeSubscription?.unsubscribe();
    this.cleanup();
  }
}
