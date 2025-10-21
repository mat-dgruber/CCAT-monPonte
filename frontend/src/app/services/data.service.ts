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
import { from, Observable, of } from 'rxjs';
import { AuthService } from './auth';

export type SortBy = 'createdAt' | 'name';
export type SortDirection = 'asc' | 'desc';

export interface Notebook {
  id: string;
  name: string;
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
    const notebooksCollection = collection(this.firestore, `users/${this.userId}/notebooks`);
    const docRef = await addDoc(notebooksCollection, { name, createdAt: serverTimestamp() });
    return docRef.id;
  }

  updateNotebook(notebookId: string, newName: string): Promise<void> {
    if (!this.userId) throw new Error('Usuário não autenticado para atualizar caderno.');
    const docRef = doc(this.firestore, `users/${this.userId}/notebooks/${notebookId}`);
    return updateDoc(docRef, { name: newName });
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
}