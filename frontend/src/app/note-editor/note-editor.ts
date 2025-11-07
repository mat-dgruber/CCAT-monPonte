import { Component, inject, OnInit, OnDestroy, signal, WritableSignal, effect, AfterViewInit, ViewContainerRef, ComponentFactoryResolver } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription, debounceTime, switchMap, of, OperatorFunction, takeUntil } from 'rxjs';

import { LucideAngularModule } from 'lucide-angular';

// Componentes e Serviços
import { Modal } from '../modal/modal';

import { StatsModalComponent } from './modals/stats-modal/stats-modal.component';
import { ClickOutsideDirective } from '../directives/click-outside.directive';
import { DataService, Note } from '../services/data.service';
import { NotificationService } from '../services/notification.service';
import { ThemeService } from '../services/theme';
import { TiptapEditorComponent } from '../tiptap-editor/tiptap-editor.component';


@Component({
  selector: 'app-note-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, Modal, StatsModalComponent, ClickOutsideDirective, TiptapEditorComponent],
  templateUrl: './note-editor.html',
  styleUrls: ['./note-editor.css']
})
export class NoteEditor implements OnInit, AfterViewInit, OnDestroy {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dataService = inject(DataService);
  private notificationService = inject(NotificationService);
  themeService = inject(ThemeService); 

   

  note: WritableSignal<Note | null> = signal(null);
  isLoading: WritableSignal<boolean> = signal(true);
  isSaving: WritableSignal<boolean> = signal(false);
  showDeleteConfirmationModal: WritableSignal<boolean> = signal(false);
  showMoreOptions: WritableSignal<boolean> = signal(false);
  tagInput: WritableSignal<string> = signal('');
  allTags: WritableSignal<string[]> = signal([]);

  

  showSearch: WritableSignal<boolean> = signal(false);
  searchTerm: WritableSignal<string> = signal('');
  searchResultCount: WritableSignal<number> = signal(0);

  showStatsModal: WritableSignal<boolean> = signal(false);

  private notebookId: string | null = null;
  private noteId: string | null = null;

  private contentChanges = new Subject<{ notebookId: string, noteId: string, content: string }>();
  private subscriptions = new Subscription();
  private destroy$ = new Subject<void>();
  private noteLoad$ = new Subject<void>(); // New Subject to signal new note loading

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
      } else {
        this.searchResultCount.set(0);
      }
    });

    // Carregar todas as tags do usuário
    this.dataService.getAllUserTags().subscribe((tags: string[]) => this.allTags.set(tags));
  }

  ngOnInit(): void {
    const routeSub = this.route.paramMap.pipe(
      switchMap(params => {
        this.notebookId = params.get('notebookId');
        this.noteId = params.get('noteId');
        if (this.notebookId && this.noteId) {
          this.isLoading.set(true);
          this.noteLoad$.next(); // Emit to signal a new note is loading
          return this.dataService.getNote(this.notebookId, this.noteId);
        }
        return of(null);
      }),
      takeUntil(this.destroy$)
    ).subscribe(note => {
      this.isLoading.set(false);
      // Clear search term and hide search bar BEFORE setting the new note
      this.searchTerm.set('');
      this.showSearch.set(false);
      if (note && note.id) { // Check for id, as it's always present if docSnap.exists() is true
        const fullNote: Note = {
          ...note, // Spread existing properties first
          title: note.title ?? '', // Use nullish coalescing operator for cleaner default
          content: note.content ?? '', // Use nullish coalescing operator for cleaner default
        };
        this.note.set(fullNote);
      } else {
        this.router.navigate(['/notebooks']);
      }
    });

    const autoSaveSub = this.contentChanges.pipe(
      debounceTime(1500),
      takeUntil(this.noteLoad$) // Use noteLoad$ here
    ).subscribe((data: { notebookId: string, noteId: string, content: string }) => {
      this.saveNote(data.notebookId, data.noteId, data.content);
    });

    this.subscriptions.add(routeSub);
    this.subscriptions.add(autoSaveSub);
  }

  ngAfterViewInit(): void {}

  

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe(); 
    this.destroy$.next(); // <--- Add this
    this.destroy$.complete(); // <--- Add this
  }

  onContentChange(newContent: string): void {
    const currentNote = this.note();
    if (this.notebookId && this.noteId && currentNote) {
      // Capture the current notebookId and noteId to ensure the correct note is saved
      const notebookIdToSave = this.notebookId;
      const noteIdToSave = this.noteId;
      this.note.set({ ...currentNote, content: newContent });
      this.contentChanges.next({ notebookId: notebookIdToSave, noteId: noteIdToSave, content: newContent });
    }
  }

  // Modify saveNote to accept notebookId and noteId as parameters
  async saveNote(notebookId: string, noteId: string, content: string) {
    if (!notebookId || !noteId) return;
    this.isSaving.set(true);
    await this.dataService.updateNote(notebookId, noteId, { content });
    this.isSaving.set(false);
  }

  onTitleChange(): void {
    const currentNote = this.note();
    if (!this.notebookId || !this.noteId || !currentNote) return;
    const notebookIdToSave = this.notebookId;
    const noteIdToSave = this.noteId;
    const titleToSave = currentNote.title;
    this.isSaving.set(true);
    setTimeout(() => {
      this.dataService.updateNote(notebookIdToSave, noteIdToSave, { title: titleToSave }).then(() => {
        this.isSaving.set(false);
      });
    }, 1000);
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

  toggleMoreOptions(): void { this.showMoreOptions.set(!this.showMoreOptions()); }
  toggleSearch(): void { this.showSearch.set(!this.showSearch()); if (!this.showSearch()) this.searchTerm.set(''); }

  openStatsModal(): void { this.showStatsModal.set(true); this.closeMoreOptions(); }
  closeStatsModal(): void { this.showStatsModal.set(false); }
  closeMoreOptions(): void { this.showMoreOptions.set(false); }
  deleteNote(): void { this.closeMoreOptions(); this.showDeleteConfirmationModal.set(true); }
  cancelDeleteNote(): void { this.showDeleteConfirmationModal.set(false); }

  async confirmDeleteNote(): Promise<void> {
    if (!this.notebookId || !this.noteId) return;
    try {
      await this.dataService.deleteNote(this.notebookId, this.noteId);
      this.notificationService.showSuccess(`Nota "${this.note()?.title}" deletada com sucesso.`);
      this.showDeleteConfirmationModal.set(false);
    } catch (error) {
      this.notificationService.showError('Erro ao deletar a nota.');
    }
  }
}