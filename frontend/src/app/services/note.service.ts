import { Injectable, inject, signal, WritableSignal, OnDestroy, effect, NgZone } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
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
  private zone = inject(NgZone); // 2. Injete o NgZone
  private notesSubscription: Subscription | null = null;

  // State Signals
  notes: WritableSignal<Note[]> = signal([]);
  isLoading: WritableSignal<boolean> = signal(false);
  loadingError: WritableSignal<boolean> = signal(false);
  activeNotebookId: WritableSignal<string | null> = signal(null);

  constructor() {
    // Combina o estado de autenticação e a seleção do caderno
    const notebookChanges$ = combineLatest([
      this.authService.authState$,
      toObservable(this.activeNotebookId) // Converte o signal para um observable
    ]);

    this.notesSubscription = notebookChanges$.pipe(
      switchMap(([user, notebookId]) => {
        if (user && notebookId) {
          this.isLoading.set(true);
          this.loadingError.set(false);
          this.notes.set([]); // Limpa as notas imediatamente

          return this.dataService.getNotes(notebookId).pipe(
            catchError(error => {
              console.error('Erro ao buscar notas:', error);
              this.loadingError.set(true);
              return of([]); // Em caso de erro, emite um array vazio
            })
          );
        } else {
          return of([]); // Se não houver usuário ou caderno, emite um array vazio
        }
      }),
      takeUntil(this.destroy$)
    ).subscribe(notes => {
      this.zone.run(() => {
        this.notes.set(notes);
        this.isLoading.set(false);
      });
    });

    // Efeito para limpar o estado no logout
    this.authService.authState$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      if (!user) {
        this.activeNotebookId.set(null);
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.notesSubscription?.unsubscribe();
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
