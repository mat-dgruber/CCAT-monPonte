import { Component, Input, OnChanges, OnDestroy, SimpleChanges, inject } from '@angular/core';
import { collection, doc, Firestore, onSnapshot, Unsubscribe, addDoc, serverTimestamp, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { AuthService } from '../services/auth';
import { Subscription } from 'rxjs';

interface Note {
  id: string;
  title: string;
  content: string;
  // Adicione outros campos que sua nota possa ter
}

@Component({
  selector: 'app-notes-list',
  standalone: true,
  imports: [],
  templateUrl: './notes-list.html',
  styleUrl: './notes-list.css',
})
export class NotesList implements OnChanges, OnDestroy {
  @Input({ required: true }) notebookId!: string;
  @Input() selectedNoteId: string | null = null;

  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private userSubscription: Subscription | null = null;
  private notesSubscription: Unsubscribe | null = null;

  userId: string | null = null;
  notes: Note[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    // 1. Reage quando o notebookId muda
    if (changes['notebookId']) {
      this.userSubscription = this.authService.authState$.subscribe(user => {
        if (user) {
          this.userId = user.uid;
          const notesCollectionPath = `users/${this.userId}/notebooks/${this.notebookId}/notes`;
          const notesCollection = collection(this.firestore, notesCollectionPath);

          // 2. Cancela a inscrição anterior para não ouvir notas do caderno antigo
          this.notesSubscription?.();

          // 3. Cria uma nova inscrição para as notas do caderno selecionado
          this.notesSubscription = onSnapshot(notesCollection, (snapshot) => {
            this.notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note));
            console.log(`Notas do caderno ${this.notebookId}:`, this.notes);
          });
        }
      });
    }
  }

  selectNote(noteId: string) {
    this.selectedNoteId = noteId;
  }

  ngOnDestroy(): void {
    // 4. Garante que todas as inscrições sejam canceladas ao destruir o componente
    this.userSubscription?.unsubscribe();
    this.notesSubscription?.();
  }

  async createNote(title: string, content: string) {
    // 1. Garante que temos um usuário e um caderno selecionado.
    if (!this.userId || !this.notebookId) {
      console.error('Usuário ou caderno não selecionado. Não é possível criar a nota.');
      return;
    }

    // 2. Monta a referência para a subcoleção de notas.
    const notesCollectionPath = `users/${this.userId}/notebooks/${this.notebookId}/notes`;
    const notesCollection = collection(this.firestore, notesCollectionPath);

    try {
      // 3. Usa addDoc para criar um novo documento com um ID gerado automaticamente.
      const docRef = await addDoc(notesCollection, { title, content, createdAt: serverTimestamp() });
      console.log('Nota criada com sucesso! ID:', docRef.id);
    } catch (error) {
      console.error('Erro ao criar a nota:', error);
    }
  }

  async updateNote(noteId: string, data: { title?: string, content?: string }) {
    // 1. Garante que temos um usuário e um caderno selecionado.
    if (!this.userId || !this.notebookId) {
      console.error('Usuário ou caderno não selecionado. Não é possível atualizar a nota.');
      return;
    }

    // 2. Monta a referência para o documento específico da nota.
    const docRef = doc(this.firestore, `users/${this.userId}/notebooks/${this.notebookId}/notes/${noteId}`);

    try {
      // 3. Usa updateDoc para atualizar apenas os campos especificados.
      await updateDoc(docRef, data);
      console.log('Nota atualizada com sucesso! ID:', noteId);
    } catch (error) {
      console.error('Erro ao atualizar a nota:', error);
    }
  }

  async deleteNote(noteId: string) {
    // 1. Garante que temos um usuário e um caderno selecionado.
    if (!this.userId || !this.notebookId) {
      console.error('Usuário ou caderno não selecionado. Não é possível deletar a nota.');
      return;
    }

    // 2. Monta a referência para o documento específico da nota.
    const docRef = doc(this.firestore, `users/${this.userId}/notebooks/${this.notebookId}/notes/${noteId}`);

    try {
      // 3. Usa deleteDoc para remover o documento.
      await deleteDoc(docRef);
      console.log('Nota deletada com sucesso! ID:', noteId);
    } catch (error) {
      console.error('Erro ao deletar a nota:', error);
    }
  }
}
