import { inject, Injectable } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  Firestore,
  onSnapshot,
  serverTimestamp,
  updateDoc, 
  addDoc,
  writeBatch, 
  getDocs,
  query,
  orderBy,
  where
} from '@angular/fire/firestore';
import { from, Observable, of, throwError } from 'rxjs';
import { AuthService } from './auth';

export type SortBy = 'createdAt' | 'name';
export type SortDirection = 'asc' | 'desc';

export interface Notebook {
  id: string;
  name: string;
  order: number;
  createdAt?: any;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt?: any;
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private userId: string | null = null;

  constructor() {
    this.authService.authState$.subscribe(user => {
      if (user) {
        this.userId = user.uid;
      } else {
        this.userId = null;
      }
    });
  }

  // --- Métodos para Cadernos (Notebooks) ---

  getNotebooks(sortBy: SortBy = 'createdAt', sortDirection: SortDirection = 'desc'): Observable<Notebook[]> {
    if (!this.userId) return of([]); // Retorna um array vazio se não houver usuário

    const notebooksCollectionRef = collection(this.firestore, `users/${this.userId}/notebooks`);    
    const q = query(notebooksCollectionRef, orderBy(sortBy, sortDirection));

    return new Observable<Notebook[]>(subscriber => {
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const notebooks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notebook));
        subscriber.next(notebooks);
      });
      // Retorna a função de unsubscribe para ser chamada quando o Observable for cancelado
      return () => unsubscribe();
    });
  }

  async createNotebook(name: string): Promise<string> {
    if (!this.userId) throw new Error('Usuário não autenticado para criar caderno.');
    const notebooksCollectionRef = collection(this.firestore, `users/${this.userId}/notebooks`);
    const snapshot = await getDocs(notebooksCollectionRef);
    const newOrder = snapshot.size; // O novo caderno será o último
    const docRef = await addDoc(notebooksCollectionRef, { name, createdAt: serverTimestamp(), order: newOrder });
    return docRef.id;
  }

  updateNotebook(notebookId: string, newName: string): Promise<void> {
    if (!this.userId) throw new Error('Usuário não autenticado para atualizar caderno.');
    const docRef = doc(this.firestore, `users/${this.userId}/notebooks/${notebookId}`);
    return updateDoc(docRef, { name: newName });
  }

  updateNotebooksOrder(notebooks: Notebook[]): Promise<void> {
    if (!this.userId) throw new Error('Usuário não autenticado para reordenar cadernos.');
    const batch = writeBatch(this.firestore);
    notebooks.forEach((notebook, index) => {
      const docRef = doc(this.firestore, `users/${this.userId}/notebooks/${notebook.id}`);
      batch.update(docRef, { order: index });
    });
    return batch.commit();
  }

  async deleteNotebook(notebookId: string): Promise<void> {
    if (!this.userId) throw new Error('Usuário não autenticado para deletar caderno.');
    
    const notebookDocRef = doc(this.firestore, `users/${this.userId}/notebooks/${notebookId}`);
    const notesCollectionRef = collection(notebookDocRef, 'notes');

    // 1. Inicia um "batch" de escritas para deletar tudo atomicamente.
    const batch = writeBatch(this.firestore);

    // 2. Pega todas as notas da subcoleção.
    const notesSnapshot = await getDocs(notesCollectionRef);
    notesSnapshot.forEach(noteDoc => {
      batch.delete(noteDoc.ref); // 3. Adiciona a deleção de cada nota ao batch.
    });

    batch.delete(notebookDocRef); // 4. Adiciona a deleção do caderno ao batch.
    return batch.commit(); // 5. Executa todas as operações de deleção.
  }

  // --- Métodos para Notas (Notes) ---

  getNotes(notebookId: string): Observable<Note[]> {
    if (!this.userId) return of([]);

    const notesCollection = collection(this.firestore, `users/${this.userId}/notebooks/${notebookId}/notes`);
    return new Observable<Note[]>(subscriber => {
      const unsubscribe = onSnapshot(notesCollection, (snapshot) => {
        const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note));
        subscriber.next(notes);
      });
      return () => unsubscribe();
    });
  }

  getNote(notebookId: string, noteId: string): Observable<Note | null> {
    if (!this.userId) return of(null);

    const noteDocRef = doc(this.firestore, `users/${this.userId}/notebooks/${notebookId}/notes/${noteId}`);
    
    return new Observable<Note | null>(subscriber => {
      const unsubscribe = onSnapshot(noteDocRef, (docSnap) => {
        subscriber.next(docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Note : null);
      });
      return () => unsubscribe();
    });
  }

  async createNote(notebookId: string, title: string, content: string): Promise<string> {
    if (!this.userId) throw new Error('Usuário não autenticado para criar nota.');
    const notesCollection = collection(this.firestore, `users/${this.userId}/notebooks/${notebookId}/notes`);
    const docRef = await addDoc(notesCollection, { title, content, createdAt: serverTimestamp() });
    return docRef.id;
  }

  updateNote(notebookId: string, noteId: string, data: { title?: string, content?: string }): Promise<void> {
    if (!this.userId) throw new Error('Usuário não autenticado para atualizar nota.');
    const docRef = doc(this.firestore, `users/${this.userId}/notebooks/${notebookId}/notes/${noteId}`);
    return updateDoc(docRef, data);
  }

  deleteNote(notebookId: string, noteId: string): Promise<void> {
    if (!this.userId) throw new Error('Usuário não autenticado para deletar nota.');
    const docRef = doc(this.firestore, `users/${this.userId}/notebooks/${notebookId}/notes/${noteId}`);
    return deleteDoc(docRef);
  }

  async moveNote(noteId: string, fromNotebookId: string, toNotebookId: string): Promise<void> {
    if (!this.userId) return throwError(() => new Error('Usuário não autenticado.'));
    if (fromNotebookId === toNotebookId) return; // Não faz nada se for o mesmo caderno

    const fromNoteRef = doc(this.firestore, `users/${this.userId}/notebooks/${fromNotebookId}/notes/${noteId}`);
    const toNotesCollectionRef = collection(this.firestore, `users/${this.userId}/notebooks/${toNotebookId}/notes`);

    const batch = writeBatch(this.firestore);

    // 1. Lê a nota original
    const noteDoc = await getDoc(fromNoteRef);
    if (!noteDoc.exists()) {
      throw new Error("A nota que você está tentando mover não existe.");
    }
    const noteData = noteDoc.data();

    // 2. Cria uma nova nota no caderno de destino com os mesmos dados
    const newNoteRef = doc(toNotesCollectionRef); // Gera um novo ID
    batch.set(newNoteRef, noteData);

    // 3. Deleta a nota original
    batch.delete(fromNoteRef);

    // 4. Executa a operação
    return batch.commit();
  }
}