import { Injectable, signal, WritableSignal, effect, inject } from '@angular/core';
import { Firestore, doc, onSnapshot, setDoc, serverTimestamp, Unsubscribe, DocumentReference, Timestamp } from '@angular/fire/firestore';
import { AuthService } from './auth';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ClipService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  private docRef: DocumentReference | null = null;
  private snapshotSubscription: Unsubscribe | null = null;
  private userSubscription: Subscription | null = null;
  private textChangeSubject = new Subject<string>();
  private textChangeSubscription: Subscription | null = null;

  // Writable signals for managing the clip's state
  copyText: WritableSignal<string> = signal('');
  showAdvancedClipOptions: WritableSignal<boolean> = signal(false);
  selectedFont: WritableSignal<string> = signal("'Courier Prime', monospace");
  selectedFontSize: WritableSignal<string> = signal('16px');
  characterCount: WritableSignal<number> = signal(0);
  wordCount: WritableSignal<number> = signal(0);

  constructor() {
    this.loadInitialState();
    this.subscribeToUser();
    this.setupTextChangeSubscription();

    effect(() => {
      const text = this.copyText();
      this.characterCount.set(text.length);
      const trimmedText = text.trim();
      this.wordCount.set(trimmedText === '' ? 0 : trimmedText.split(/\s+/).length);
      localStorage.setItem('clipShowAdvancedOptions', JSON.stringify(this.showAdvancedClipOptions()));
      localStorage.setItem('clipFontPreference', this.selectedFont());
      localStorage.setItem('clipFontSizePreference', this.selectedFontSize());
    });
  }

  private loadInitialState(): void {
    if (typeof localStorage !== 'undefined') {
      this.showAdvancedClipOptions.set(JSON.parse(localStorage.getItem('clipShowAdvancedOptions') || 'false'));
      this.selectedFont.set(localStorage.getItem('clipFontPreference') || "'Courier Prime', monospace");
      this.selectedFontSize.set(localStorage.getItem('clipFontSizePreference') || '16px');
    }
  }

  private subscribeToUser(): void {
    this.userSubscription = this.authService.authState$.subscribe(user => {
      if (user) {
        this.docRef = doc(this.firestore, `clip/${user.uid}`);
        this.subscribeToSnapshot();
      } else {
        this.cleanup();
      }
    });
  }

  private subscribeToSnapshot(): void {
    if (this.snapshotSubscription) {
      this.snapshotSubscription();
    }
    this.snapshotSubscription = onSnapshot(this.docRef!, (docSnap) => {
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

  onTextChange(text: string): void {
    this.copyText.set(text);
    this.textChangeSubject.next(text);
  }

  async saveClip(text: string): Promise<void> {
    if (!this.docRef) return;

    try {
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + 24);
      await setDoc(this.docRef, { text, expiresAt: Timestamp.fromDate(expirationDate) });
    } catch (error) {
      console.error('Error saving document:', error);
    }
  }

  private cleanup(): void {
    this.snapshotSubscription?.();
    this.snapshotSubscription = null;
    this.docRef = null;
    this.copyText.set('');
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
    this.textChangeSubscription?.unsubscribe();
    this.cleanup();
  }
}
