import { Component, inject, OnInit, OnDestroy, signal, WritableSignal, effect, AfterViewInit, ViewContainerRef, ComponentFactoryResolver, Output, EventEmitter } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';

import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription, debounceTime, switchMap, of, OperatorFunction, takeUntil, map, filter } from 'rxjs';

import { LucideAngularModule } from 'lucide-angular';

// Componentes e Serviços
import { StatsModalComponent } from './modals/stats-modal/stats-modal.component';
import { DataService, Note } from '../../services/data.service';
import { NoteService } from '../../services/note.service';
import { NotificationService } from '../../services/notification.service';
import { ThemeService } from '../../services/theme';
import { TiptapEditorComponent } from '../tiptap-editor/tiptap-editor.component';
import { ResponsiveService } from '../../services/responsive';


@Component({
  selector: 'app-note-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, StatsModalComponent, TiptapEditorComponent],
  templateUrl: './note-editor.html',
  styleUrls: ['./note-editor.css'],
  animations: [
    trigger('flyInOut', [
      state('void', style({ transform: 'translateY(-10%)', opacity: 0 })),
      transition('void => *', [
        animate('150ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition('* => void', [
        animate('150ms ease-in', style({ transform: 'translateY(-10%)', opacity: 0 }))
      ])
    ])
  ]
})
export class NoteEditor implements OnInit, AfterViewInit, OnDestroy {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dataService = inject(DataService);
  private noteService = inject(NoteService);
  private notificationService = inject(NotificationService);
  private location = inject(Location);
  themeService = inject(ThemeService);
  responsiveService = inject(ResponsiveService);

  note: WritableSignal<Note | null> = signal(null);
  isLoading: WritableSignal<boolean> = signal(true);
  isSaving: WritableSignal<boolean> = signal(false);
  showMoreOptions: WritableSignal<boolean> = signal(false);
  tagInput: WritableSignal<string> = signal('');
  allTags: WritableSignal<string[]> = signal([]);

  

  showSearch: WritableSignal<boolean> = signal(false);
  searchTerm: WritableSignal<string> = signal('');
  searchResultCount: WritableSignal<number> = signal(0);
  currentMatchIndex: WritableSignal<number> = signal(0);

  showStatsModal: WritableSignal<boolean> = signal(false);

  private notebookId: string | null = null;
  private noteId: string | null = null;
  private lastSavedContent: string | null = null;

  private contentChanges = new Subject<string>();
  private titleChanges = new Subject<string>();
  private searchTermChanges = new Subject<string>();
  private subscriptions = new Subscription();
  private destroy$ = new Subject<void>();

  constructor() {
    effect(() => {
      const term = this.searchTerm();
      const content = this.note()?.content || '';
      if (term && content) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        const textContent = tempDiv.textContent || tempDiv.innerText || '';
        const matches = textContent.match(new RegExp(term, 'gi'));
        this.searchResultCount.set(matches ? matches.length : 0);
        this.currentMatchIndex.set(0);
      } else {
        this.searchResultCount.set(0);
        this.currentMatchIndex.set(0);
      }
    });

    // Carregar todas as tags do usuário
    this.dataService.getAllUserTags().subscribe((tags: string[]) => this.allTags.set(tags));

    this.subscriptions.add(this.searchTermChanges.pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(term => {
      this.searchTerm.set(term);
    }));
  }

  ngOnInit(): void {
    const note$ = this.route.paramMap.pipe(
      switchMap(params => {
        this.notebookId = params.get('notebookId');
        this.noteId = params.get('noteId');
        if (this.notebookId && this.noteId) {
          this.isLoading.set(true);
          return this.dataService.getNote(this.notebookId, this.noteId);
        }
        return of(null);
      }),
      takeUntil(this.destroy$)
    );

    this.subscriptions.add(note$.subscribe(note => {
      this.isLoading.set(false);
      
      // Only reset search on initial load, not every update (optional improvement, but sticking to content fix primarily)
      // Actually, keeping original behavior for non-content logic to minimize side effects, 
      // but moving them inside "if not echo" check might be safer or just leaving them.
      // The original code reset them every time. Let's keep it safe.

      if (note && note.id) {
        let contentToUse = note.content ?? '';

        // FIX: Check if incoming content is just an echo of what we saved
        if (this.lastSavedContent !== null && contentToUse === this.lastSavedContent) {
           // It is an echo. Prefer current local content to preserve cursor/typing.
           const currentLocal = this.note();
           if (currentLocal) {
             contentToUse = currentLocal.content;
           }
        } else {
           // Content is different (new from remote, or we haven't saved yet).
           // Update our baseline.
           this.lastSavedContent = contentToUse; 
        }

        this.note.set({ ...note, title: note.title ?? '', content: contentToUse });
      } else {
        this.note.set(null);
        this.searchTerm.set('');
        this.showSearch.set(false);
      }
    }));

    const contentSave$ = this.contentChanges.pipe(
      debounceTime(500),
      switchMap(content => {
        if (this.notebookId && this.noteId) {
          this.lastSavedContent = content; // Store the content we are about to save
          return this.dataService.updateNote(this.notebookId, this.noteId, { content });
        }
        return of(null);
      })
    );

    const titleSave$ = this.titleChanges.pipe(
      debounceTime(500),
      switchMap(title => {
        if (this.notebookId && this.noteId) {
          return this.dataService.updateNote(this.notebookId, this.noteId, { title });
        }
        return of(null);
      })
    );

    this.subscriptions.add(note$.pipe(
      switchMap(() => {
        this.isSaving.set(false); // Reset saving state on new note
        return contentSave$;
      })
    ).subscribe(() => this.isSaving.set(false)));

    this.subscriptions.add(note$.pipe(
      switchMap(() => {
        this.isSaving.set(false);
        return titleSave$;
      })
    ).subscribe(() => this.isSaving.set(false)));
  }

  ngAfterViewInit(): void {}

  

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe(); 
    this.destroy$.next(); // <--- Add this
    this.destroy$.complete(); // <--- Add this
  }

  onContentChange(newContent: string): void {
    const currentNote = this.note();
    if (currentNote) {
      this.note.set({ ...currentNote, content: newContent });
      this.isSaving.set(true);
      this.contentChanges.next(newContent);
    }
  }

  onTitleChange(): void {
    const currentNote = this.note();
    if (currentNote) {
      this.isSaving.set(true);
      this.titleChanges.next(currentNote.title);
    }
  }

  async togglePin() {
    if (!this.notebookId || !this.noteId || !this.note()) return;
    const currentNote = this.note()!;
    const newPinnedStatus = !currentNote.isPinned;
    this.note.set({ ...currentNote, isPinned: newPinnedStatus });
    try {
      await this.dataService.updateNotePinnedStatus(this.notebookId, this.noteId, newPinnedStatus);
      this.notificationService.showSuccess(`Nota ${newPinnedStatus ? 'fixada' : 'desafixada'} com sucesso.`);
    } catch (error) {
      this.note.set({ ...currentNote, isPinned: !newPinnedStatus });
      this.notificationService.showError('Erro ao atualizar a nota.');
    } finally {
      this.closeMoreOptions();
    }
  }

  addTag(): void {
    const newTag = this.tagInput().trim();
    if (newTag && this.note()) {
      const currentNote = this.note()!;
      if (!currentNote.tags) currentNote.tags = [];
      if (!currentNote.tags.includes(newTag)) {
        currentNote.tags.push(newTag);
        this.note.set({ ...currentNote });
        this.updateTags();
      }
      this.tagInput.set('');
    }
  }

  removeTag(tagToRemove: string): void {
    if (this.note()) {
      const currentNote = this.note()!;
      currentNote.tags = currentNote.tags?.filter((tag: string) => tag !== tagToRemove);
      this.note.set({ ...currentNote });
      this.updateTags();
    }
  }

  private async updateTags(): Promise<void> {
    if (!this.notebookId || !this.noteId || !this.note()?.tags) return;
    try {
      this.isSaving.set(true);
      await this.dataService.updateNoteTags(this.notebookId, this.noteId, this.note()!.tags!);
    } catch (error) {
      this.notificationService.showError('Erro ao salvar as tags.');
    } finally {
      this.isSaving.set(false);
    }
  }

  onSearchTermChange(term: string): void {
    this.searchTermChanges.next(term);
  }

  toggleMoreOptions(): void { this.showMoreOptions.set(!this.showMoreOptions()); }
  toggleSearch(): void { this.showSearch.set(!this.showSearch()); if (!this.showSearch()) this.searchTerm.set(''); }

  openStatsModal(): void { this.showStatsModal.set(true); this.closeMoreOptions(); }
  closeStatsModal(): void { this.showStatsModal.set(false); }
  closeMoreOptions(): void { this.showMoreOptions.set(false); }

  deleteNote(): void {
    const noteToDelete = this.note();
    if (noteToDelete) {
      this.noteService.requestDeleteNote(noteToDelete);
    }
    this.closeMoreOptions();
  }

  goToNextMatch(): void {
    if (this.searchResultCount() > 0) {
      this.currentMatchIndex.set((this.currentMatchIndex() + 1) % this.searchResultCount());
    }
  }

  goToPreviousMatch(): void {
    if (this.searchResultCount() > 0) {
      this.currentMatchIndex.set((this.currentMatchIndex() - 1 + this.searchResultCount()) % this.searchResultCount());
    }
  }

  navigateBack(): void {
    this.router.navigate(['/notebooks']);
  }
}