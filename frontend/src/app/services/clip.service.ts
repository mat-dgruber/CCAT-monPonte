import { Injectable, signal, WritableSignal, inject, computed, OnDestroy } from '@angular/core';
import { Firestore, doc, setDoc, docData, DocumentReference, Timestamp } from '@angular/fire/firestore';
import { AuthService } from './auth';
import { Subject, Subscription, of, combineLatest } from 'rxjs';
import { debounceTime, switchMap, tap, map, catchError, take } from 'rxjs/operators';
import { User } from '@angular/fire/auth';

export type SyncStatus = 'saved' | 'saving' | 'error' | 'idle';

@Injectable({
  providedIn: 'root'
})
export class ClipService implements OnDestroy {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  private clipDocRef: DocumentReference | null = null;
  private settingsDocRef: DocumentReference | null = null;
  
  private destroy$ = new Subject<void>();
  private textChangeSubject = new Subject<string>();
  
  // Subscriptions
  private dataSubscription: Subscription | null = null;
  private settingsSubscription: Subscription | null = null;
  private textChangeSubscription: Subscription | null = null;

  // Signals
  copyText: WritableSignal<string> = signal('');
  syncStatus: WritableSignal<SyncStatus> = signal('idle');
  
  // Settings Signals
  showAdvancedClipOptions: WritableSignal<boolean> = signal(false);
  selectedFont: WritableSignal<string> = signal("'Courier Prime', monospace");
  selectedFontSize: WritableSignal<string> = signal('16px');
  clipDisappearanceHours: WritableSignal<number> = signal(1);
  showCounts: WritableSignal<boolean> = signal(true);
  showFontSelect: WritableSignal<boolean> = signal(true);
  showFontSizeSelect: WritableSignal<boolean> = signal(true);

  // Computed
  characterCount = computed(() => this.copyText().length);
  wordCount = computed(() => {
    const text = this.copyText().trim();
    return text === '' ? 0 : text.split(/\s+/).length;
  });

  constructor() {
    this.initializeDataSync();
    this.setupTextChangeSubscription();
  }

  private initializeDataSync(): void {
    // Sync Clip Data
    this.dataSubscription = this.authService.authState$.pipe(
      switchMap(user => {
        if (!user) {
          this.cleanup();
          return of(null);
        }
        
        this.clipDocRef = doc(this.firestore, `clip/${user.uid}`);
        return docData(this.clipDocRef).pipe(
          tap((data: any) => {
            if (data) {
              const text = data['text'] ?? '';
              const expiresAt = data['expiresAt'] as Timestamp | undefined;

              if (expiresAt && new Date() > expiresAt.toDate()) {
                // Expired, only clear local if we haven't just typed (avoid race condition ideally, but expiration is rare)
                // For safety, we just use the remote text. If it expired, remote matches.
                if (this.copyText() !== '' && text === '') {
                    // It was cleared remotely explicitly or expired
                    this.copyText.set('');
                }
              } else {
                 // Simple Last Write Wins: Remote updates local. 
                 // We compare to avoid resetting cursor if possible, though simple binding refills it.
                 // Note: To truly fix cursor jumps, we need to check if *we* are the ones writing.
                 // But for now, ensuring we receive updates in Zone is step 1.
                 if (data['text'] !== this.copyText()) {
                    this.copyText.set(text);
                 }
              }
            } else {
               // Doc doesn't exist yet
               if (this.copyText() !== '') this.copyText.set('');
            }
          })
        );
      })
    ).subscribe();

    // Sync Settings
    this.settingsSubscription = this.authService.authState$.pipe(
      switchMap(user => {
        if (!user) return of(null);
        
        this.settingsDocRef = doc(this.firestore, `user_settings/${user.uid}`);
        return docData(this.settingsDocRef).pipe(
          tap((data: any) => {
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
          })
        );
      })
    ).subscribe();
  }

  private setupTextChangeSubscription(): void {
    this.textChangeSubscription = this.textChangeSubject
      .pipe(
        tap(() => this.syncStatus.set('saving')),
        debounceTime(500),
        switchMap(text => this.saveClip(text))
      )
      .subscribe({
        next: () => this.syncStatus.set('saved'),
        error: (err) => {
          console.error('Error in save loop', err);
          this.syncStatus.set('error');
        }
      });
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
      throw error;
    }
  }

  // ... Settings methods ...
  private async updateSettings(newSettings: any): Promise<void> {
    if (!this.settingsDocRef) return;
    try {
        // We do a merge set. We don't need to read first if we blindly merge.
        // But to be safe and match previous logic:
        await setDoc(this.settingsDocRef, { clipSettings: newSettings }, { merge: true });
    } catch (error) {
      console.error('Error saving clip settings:', error);
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
    this.clipDocRef = null;
    this.settingsDocRef = null;
    this.copyText.set('');
    this.syncStatus.set('idle');
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
    this.destroy$.next();
    this.destroy$.complete();
    this.dataSubscription?.unsubscribe();
    this.settingsSubscription?.unsubscribe();
    this.textChangeSubscription?.unsubscribe();
  }
}
