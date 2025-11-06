import { inject, Injectable, NgZone } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  Firestore,
  onSnapshot,
  collectionGroup,
  serverTimestamp,
  updateDoc, 
  addDoc,
  writeBatch, 
  getDocs,
  getDoc,
  query,
  orderBy,
  where
} from '@angular/fire/firestore';
import { from, Observable, of, throwError } from 'rxjs';
import { AuthService } from './auth';
import { Note } from './note.service';

export type { Note };
export type SortBy = 'createdAt' | 'name';
export type SortDirection = 'asc' | 'desc';

export interface Notebook {
  id: string;
  name: string;
  color?: string;
  order: number;
  createdAt?: any;
  isFavorite?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private userId: string | null = null;
  private zone = inject(NgZone);

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
        this.zone.run(() => {
          subscriber.next(notebooks);
        });
      });
      // Retorna a função de unsubscribe para ser chamada quando o Observable for cancelado
      return () => unsubscribe();
    });
  }

  async createNotebook(name: string, color: string = '#FFFFFF'): Promise<string> {
    if (!this.userId) throw new Error('Usuário não autenticado para criar caderno.');
    const notebooksCollectionRef = collection(this.firestore, `users/${this.userId}/notebooks`);
    const snapshot = await getDocs(notebooksCollectionRef);
    const newOrder = snapshot.size; // O novo caderno será o último
    const docRef = await addDoc(notebooksCollectionRef, { name, createdAt: serverTimestamp(), order: newOrder, color, isFavorite: false });
    return docRef.id;
  }

  updateNotebookFavoriteStatus(notebookId: string, isFavorite: boolean): Promise<void> {
    if (!this.userId) throw new Error('Usuário não autenticado para atualizar o status de favorito.');
    const docRef = doc(this.firestore, `users/${this.userId}/notebooks/${notebookId}`);
    return updateDoc(docRef, { isFavorite });
  }

  updateNotebookColor(notebookId: string, color: string): Promise<void> {
    if (!this.userId) throw new Error('Usuário não autenticado para atualizar a cor do caderno.');
    const docRef = doc(this.firestore, `users/${this.userId}/notebooks/${notebookId}`);
    return updateDoc(docRef, { color });
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
    const q = query(notesCollection, orderBy('createdAt', 'desc'));

    return new Observable<Note[]>(subscriber => {
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const notes = snapshot.docs.map(doc => ({ id: doc.id, notebookId: notebookId, ...doc.data() } as Note));
        this.zone.run(() => {
          subscriber.next(notes);
        });
      });
      return () => unsubscribe();
    });
  }

  getNote(notebookId: string, noteId: string): Observable<Note | null> {
    if (!this.userId) return of(null);

    const noteDocRef = doc(this.firestore, `users/${this.userId}/notebooks/${notebookId}/notes/${noteId}`);
    
    return new Observable<Note | null>(subscriber => {
      const unsubscribe = onSnapshot(noteDocRef, (docSnap) => {
        this.zone.run(() => {
          subscriber.next(docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Note : null);
        });
      });
      return () => unsubscribe();
    });
  }

  async createNote(notebookId: string, title: string, content: string, tags: string[], isPinned: boolean): Promise<string> {
    if (!this.userId) throw new Error('Usuário não autenticado para criar nota.');
    const notesCollection = collection(this.firestore, `users/${this.userId}/notebooks/${notebookId}/notes`);
    const docRef = await addDoc(notesCollection, { title, content, createdAt: serverTimestamp(), tags, isPinned });
    return docRef.id;
  }

  updateNoteTags(notebookId: string, noteId: string, tags: string[]): Promise<void> {
    if (!this.userId) throw new Error('Usuário não autenticado para atualizar as tags da nota.');
    const docRef = doc(this.firestore, `users/${this.userId}/notebooks/${notebookId}/notes/${noteId}`);
    return updateDoc(docRef, { tags });
  }

  updateNotePinnedStatus(notebookId: string, noteId: string, isPinned: boolean): Promise<void> {
    if (!this.userId) throw new Error('Usuário não autenticado para atualizar o status de fixação da nota.');
    const docRef = doc(this.firestore, `users/${this.userId}/notebooks/${notebookId}/notes/${noteId}`);
    return updateDoc(docRef, { isPinned });
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

  // --- Métodos para Tags ---

  getAllUserTags(): Observable<string[]> {
    if (!this.userId) return of([]);

    const userPath = `users/${this.userId}`;
    const notesCollectionGroup = collectionGroup(this.firestore, 'notes');

    // Precisamos garantir que a consulta seja feita dentro do caminho do usuário.
    // Isso requer que o 'userId' esteja em algum campo dentro do documento da nota.
    // Vamos assumir que não está, então teremos que buscar todos os cadernos primeiro.

    return new Observable<string[]>(subscriber => {
      const notebooksCollectionRef = collection(this.firestore, `users/${this.userId}/notebooks`);
      getDocs(notebooksCollectionRef).then(notebooksSnapshot => {
        const allTags = new Set<string>();
        const notePromises: Promise<any>[] = [];

        notebooksSnapshot.forEach(notebookDoc => {
          const notesCollectionRef = collection(notebookDoc.ref, 'notes');
          notePromises.push(getDocs(notesCollectionRef));
        });

        Promise.all(notePromises).then(notesSnapshots => {
          notesSnapshots.forEach(notesSnapshot => {
            notesSnapshot.forEach((noteDoc: { data: () => { (): any; new(): any; tags: any[]; }; }) => {
              const noteData = noteDoc.data();
              if (noteData.tags && Array.isArray(noteData.tags)) {
                noteData.tags.forEach(tag => allTags.add(tag));
              }
            });
          });
          this.zone.run(() => {
            subscriber.next(Array.from(allTags));
          });
        });
      });
    });
  }
}