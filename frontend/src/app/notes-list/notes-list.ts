import { Component, Input, OnChanges, OnDestroy, SimpleChanges, inject, signal, WritableSignal, computed, Signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { collection, doc, Firestore, onSnapshot, Unsubscribe, addDoc, serverTimestamp, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { HighlightPipe } from '../pipes/highlight.pipe';
import { AuthService } from '../services/auth';
import { DataService, Note, SortBy, SortDirection } from '../services/data.service';
import { Subscription } from 'rxjs';
import { NoteEditor } from '../note-editor/note-editor';
import { Modal } from '../modal/modal';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-notes-list',
  standalone: true,
  imports: [NoteEditor, NgClass, Modal, FormsModule],
  templateUrl: './notes-list.html',
  styleUrl: './notes-list.css',
})
export class NotesList implements OnChanges, OnDestroy {
  @Input({ required: true }) notebookId!: string;
  @Input({ required: true }) userId!: string | null;
  @Input() searchTerm: string = '';

  private authService = inject(AuthService);
  private dataService = inject(DataService);
  private notesSubscription: Subscription | null = null;

  notes: WritableSignal<Note[]> = signal([]);
  selectedNoteId: WritableSignal<string | null> = signal(null);
  isLoading = signal(false);
  showNoteEditor: WritableSignal<boolean> = signal(false);
  noteToEdit: WritableSignal<Note | null> = signal(null);
  viewMode: WritableSignal<'grid' | 'list'> = signal('grid');
  sortOption: WritableSignal<{ by: SortBy, direction: SortDirection }> = signal({ by: 'createdAt', direction: 'desc' });
  showCreateNoteModal: WritableSignal<boolean> = signal(false);
  newNoteTitle: WritableSignal<string> = signal('');
  newNoteContent: WritableSignal<string> = signal('');

  // Signal computado para filtrar as notas localmente
  filteredNotes: Signal<Note[]> = computed(() => {
    const term = this.searchTerm.toLowerCase();
    if (!term) {
      return this.notes();
    }
    return this.notes().filter(note =>
      note.title.toLowerCase().includes(term) ||
      note.content.toLowerCase().includes(term)
    );
  });

  sortedNotes: Signal<Note[]> = computed(() => {
    const notes = this.filteredNotes();
    const { by, direction } = this.sortOption();

    return [...notes].sort((a, b) => {
      const aValue = (a as any)[by];
      const bValue = (b as any)[by];

      if (aValue < bValue) {
        return direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  });

  ngOnChanges(changes: SimpleChanges): void {
    const notebookIdChange = changes['notebookId'];

    if (notebookIdChange && notebookIdChange.currentValue) {
      this.userId = this.authService.getCurrentUserId();
      this.fetchAllNotes();
    }
  }

  private fetchAllNotes() {
    if (!this.userId) return;
    this.isLoading.set(true);
    this.notesSubscription?.unsubscribe();
    this.notesSubscription = this.dataService.getNotes(this.notebookId).subscribe((notes: Note[]) => {
      this.notes.set(notes);
      this.isLoading.set(false);
    });
  }

  selectNote(noteId: string) {
    this.selectedNoteId.set(noteId);
  }

  ngOnDestroy(): void {
    // 4. Garante que todas as inscrições sejam canceladas ao destruir o componente
    this.notesSubscription?.unsubscribe();
  }

  setViewMode(mode: 'grid' | 'list') {
    this.viewMode.set(mode);
  }

  changeSortOrder(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const [by, direction] = selectElement.value.split('-') as [SortBy, SortDirection];
    this.sortOption.set({ by, direction });
  }

  openCreateNoteModal() {
    this.newNoteTitle.set('');
    this.newNoteContent.set('');
    this.showCreateNoteModal.set(true);
  }

  closeCreateNoteModal() {
    this.showCreateNoteModal.set(false);
  }

  async handleCreateNote() {
    const title = this.newNoteTitle().trim();
    const content = this.newNoteContent().trim();
    if (title !== '' && content !== '') {
      await this.createNote(title, content);
      this.closeCreateNoteModal();
    }
  }

  async createNote(title: string, content: string) {
    // 1. Garante que temos um usuário e um caderno selecionado.
    if (!this.userId || !this.notebookId) {
      console.error('Usuário ou caderno não selecionado. Não é possível criar a nota.');
      return;
    }

    try {
      const newId = await this.dataService.createNote(this.notebookId, title, content);
      console.log('Nota criada com sucesso! ID:', newId);
    } catch (error) {
      console.error('Erro ao criar a nota:', error);
    }
  }

  openNoteEditor(note: Note) {
    this.noteToEdit.set(note);
    this.showNoteEditor.set(true);
  }

  closeNoteEditor() {
    this.noteToEdit.set(null);
    this.showNoteEditor.set(false);
  }

  async handleSaveNote(note: Note) {
    await this.updateNote(note.id, { title: note.title, content: note.content });
    this.closeNoteEditor();
  }

  async updateNote(noteId: string, data: { title?: string, content?: string }) {
    // 1. Garante que temos um usuário e um caderno selecionado.
    if (!this.userId || !this.notebookId) {
      console.error('Usuário ou caderno não selecionado. Não é possível atualizar a nota.');
      return;
    }

    try {
      await this.dataService.updateNote(this.notebookId, noteId, data);
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

    try {
      await this.dataService.deleteNote(this.notebookId, noteId);
      console.log('Nota deletada com sucesso! ID:', noteId);
    } catch (error) {
      console.error('Erro ao deletar a nota:', error);
    }
  }
}
