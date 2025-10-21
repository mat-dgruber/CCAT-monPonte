import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Firestore, doc, DocumentReference, onSnapshot, Unsubscribe, setDoc } from '@angular/fire/firestore';
import { AuthService } from '../services/auth';
import { Subscription, Subject, debounceTime } from 'rxjs';


@Component({
  selector: 'app-clip',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './clip.html',
  styleUrl: './clip.css'
})
export class Clip implements OnInit, OnDestroy {

  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private userSubscription: Subscription | null = null;
  private snapshotSubscription: Unsubscribe | null = null;
  private textChangeSubject = new Subject<string>();
  private textChangeSubscription: Subscription | null = null;
  private docRef: DocumentReference | null = null;

  copyText: string = '';
  userId: string | null = null;

  ngOnInit() {
    this.userSubscription = this.authService.authState$.subscribe(user => {
      if (user) {
        this.userId = user.uid;
        this.docRef = doc(this.firestore, `clip/${this.userId}`);
        this.snapshotSubscription = onSnapshot(this.docRef, (docSnap) => {
          if (docSnap.exists()) {
            // O '?? '' ' garante que copyText seja uma string vazia se o campo 'text' não existir.
            this.copyText = docSnap.data()['text'] ?? '';
            console.log('Document data updated:', this.copyText);
          } else {
            // O documento ainda não existe para este usuário.
            console.log('No document found for this user.');
            this.copyText = '';
          }
        });
      } else {
        this.userId = null;
        this.docRef = null;
        if (this.snapshotSubscription) {
          this.snapshotSubscription(); // Para de ouvir as mudanças do usuário anterior
          this.snapshotSubscription = null;
        }
        console.log('User logged out.');
      }
    });

    this.textChangeSubscription = this.textChangeSubject
      .pipe(debounceTime(500)) // Espera 500ms após a última alteração
      .subscribe(async (text) => {
        if (this.docRef) {
          try {
            await setDoc(this.docRef, { text: text });
            console.log('Document saved.');
          } catch (error) {
            console.error('Error saving document:', error);
          }
        }
      });
  }

  ngOnDestroy() {
    this.userSubscription?.unsubscribe();
    this.snapshotSubscription?.();
    this.textChangeSubscription?.unsubscribe();
  }

  async onCopy() {
    try {
      await navigator.clipboard.writeText(this.copyText);
      console.log('Text copied to clipboard');
    } catch (error) {
      console.error('Failed to copy text: ', error);
    }
  }

  onTextChange(text: string) {
    this.textChangeSubject.next(text);
  }

}
