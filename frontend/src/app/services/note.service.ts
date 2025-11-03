import { Injectable, inject, signal, WritableSignal, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { DataService } from './data.service';
import { AuthService } from './auth';
import { of, Subject, combineLatest, Subscription } from 'rxjs';
import { switchMap, catchError, takeUntil, tap, filter, map } from 'rxjs/operators';

export interface Note {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  createdAt?: any;
  notebookId?: string;
  isPinned?: boolean;
}


@Injectable({
  providedIn: 'root'
})
export class NoteService implements OnDestroy {
  private dataService = inject(DataService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroy$ = new Subject<void>();

  // State Signals
  notes: WritableSignal<Note[]> = signal([]);
  isLoading: WritableSignal<boolean> = signal(false);
  loadingError: WritableSignal<boolean> = signal(false);
  activeNotebookId: WritableSignal<string | null> = signal(null);

  private notesSubscription: Subscription | null = null;

  constructor() {
    this.authService.authState$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      if (!user) {
        this.notes.set([]);
        this.activeNotebookId.set(null);
        this.isLoading.set(false);
      }
    });
  }

  loadNotesForNotebook(notebookId: string | null) {
    if (this.notesSubscription) {
      this.notesSubscription.unsubscribe();
    }

    if (!notebookId) {
      this.notes.set([]);
      this.activeNotebookId.set(null);
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.loadingError.set(false);
    this.activeNotebookId.set(notebookId);

    this.notesSubscription = this.dataService.getNotes(notebookId).pipe(
      catchError(error => {
        console.error('Erro ao buscar notas:', error);
        this.loadingError.set(true);
        return of([]);
      }),
      takeUntil(this.destroy$)
    ).subscribe(notes => {
      this.notes.set(notes);
      this.isLoading.set(false);
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // --- Métodos de Ação --- 

  createNote(title: string, content: string): Promise<string | null> {
    const notebookId = this.activeNotebookId();
    if (!notebookId) {
      console.error('Nenhum caderno ativo para criar a nota.');
      return Promise.resolve(null);
    }
    return this.dataService.createNote(notebookId, title, content);
  }

  updateNote(noteId: string, data: { title?: string, content?: string }): Promise<void | null> {
    const notebookId = this.activeNotebookId();
    if (!notebookId) {
      console.error('Nenhum caderno ativo para atualizar a nota.');
      return Promise.resolve(null);
    }
    return this.dataService.updateNote(notebookId, noteId, data);
  }

  updateNotePinnedStatus(noteId: string, isPinned: boolean): Promise<void | null> {
    const notebookId = this.activeNotebookId();
    if (!notebookId) {
      console.error('Nenhum caderno ativo para atualizar a nota.');
      return Promise.resolve(null);
    }
    return this.dataService.updateNotePinnedStatus(notebookId, noteId, isPinned);
  }
}
