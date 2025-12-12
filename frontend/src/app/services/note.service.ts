import { Injectable, inject, signal, WritableSignal, OnDestroy, effect, NgZone } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { DataService, Note } from './data.service';
import { AuthService } from './auth';
import { of, Subject, combineLatest, Subscription } from 'rxjs';
import { switchMap, catchError, takeUntil, tap, filter, map } from 'rxjs/operators';




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

  showArchived: WritableSignal<boolean> = signal(false);
  showTrashed: WritableSignal<boolean> = signal(false);

  // Subject for delete requests
  private deleteNoteRequest = new Subject<Note>();
  deleteNoteRequest$ = this.deleteNoteRequest.asObservable();

  constructor() {
    // Combina o estado de autenticação e a seleção do caderno
    const notebookChanges$ = combineLatest([
      this.authService.authState$,
      toObservable(this.activeNotebookId),

      toObservable(this.showArchived),
      toObservable(this.showTrashed)
    ]);

    this.notesSubscription = notebookChanges$.pipe(
      tap(([user, notebookId, showArchived, showTrashed]) => console.log(`NoteService: combining - NB: ${notebookId}, Arch: ${showArchived}, Trash: ${showTrashed}`)),
      switchMap(([user, notebookId, showArchived, showTrashed]) => {
        if (user && notebookId) {
          this.isLoading.set(true);
          this.loadingError.set(false);
          this.notes.set([]);

          return this.dataService.getNotes(notebookId, false, showArchived, showTrashed).pipe(
            tap(notes => console.log(`NoteService: Received ${notes.length} notes`)),
            catchError(error => {
              console.error('Erro ao buscar notas:', error);
              this.loadingError.set(true);
              return of([]); // Em caso de erro, emite um array vazio
            })
          );
        } else {
          console.log('NoteService: No user or notebookId, returning empty array.');
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
      } else {
        // Run cleanup on login/init
        this.dataService.cleanupTrash().catch(err => console.error('Error cleaning trash:', err));
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.notesSubscription?.unsubscribe();
  }

  // --- Métodos de Ação ---

  createNote(title: string, content: string, tags: string[] = [], isPinned: boolean = false): Promise<string | null> {
    const notebookId = this.activeNotebookId();
    if (!notebookId) {
      console.error('Nenhum caderno ativo para criar a nota.');
      return Promise.resolve(null);
    }
    return this.dataService.createNote(notebookId, title, content, tags, isPinned);
  }

  updateNote(noteId: string, data: { title?: string, content?: string, tags?: string[], isPinned?: boolean }): Promise<void | null> {
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

  updateNoteArchivedStatus(note: Note, isArchived: boolean): Promise<void | null> {
    const notebookId = this.activeNotebookId();
    if (!notebookId) {
      console.error('Nenhum caderno ativo para atualizar a nota.');
      return Promise.resolve(null);
    }
    return this.dataService.updateNoteArchivedStatus(notebookId, note.id, isArchived);
  }

  deleteNote(noteId: string): Promise<void | null> {
    const notebookId = this.activeNotebookId();
    if (!notebookId) return Promise.resolve(null);
    return this.dataService.deleteNote(notebookId, noteId);
  }

  deleteNotePermanently(noteId: string): Promise<void | null> {
    const notebookId = this.activeNotebookId();
    if (!notebookId) return Promise.resolve(null);
    return this.dataService.deleteNotePermanently(notebookId, noteId);
  }

  restoreNote(note: Note): Promise<void | null> {
    const notebookId = this.activeNotebookId();
    if (!notebookId) return Promise.resolve(null);
    return this.dataService.restoreNote(notebookId, note.id);
  }

  // History Delegates
  saveVersion(noteId: string, content: string): Promise<void | null> {
    const notebookId = this.activeNotebookId();
    if (!notebookId) return Promise.resolve(null);
    return this.dataService.saveNoteVersion(notebookId, noteId, content);
  }

  getHistory(noteId: string) {
    const notebookId = this.activeNotebookId();
    if (!notebookId) return of([]);
    return this.dataService.getNoteHistory(notebookId, noteId);
  }

  requestDeleteNote(note: Note) {
    this.deleteNoteRequest.next(note);
  }
}
