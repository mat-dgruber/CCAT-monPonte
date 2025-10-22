import { Component, Input, OnChanges, OnDestroy, SimpleChanges, inject, signal, WritableSignal, computed, Signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { DataService, Note } from '../services/data.service';
import { Subscription, debounceTime, Subject } from 'rxjs';
import { HighlightPipe } from '../pipes/highlight.pipe';
import { ConfirmationModalComponent } from './modals/confirmation-modal.component';
import { NotificationService } from '../services/notification.service';

type ViewMode = 'grid' | 'list';

@Component({
  selector: 'app-notes-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmationModalComponent, HighlightPipe],
  templateUrl: './notes-list.html',
  styleUrl: './notes-list.css',
  animations: [
    trigger('listAnimation', [
      transition(':enter', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger(50, [ // 50ms de atraso entre cada item
            animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class NotesList implements OnChanges, OnDestroy, OnInit {
  @Input() notebookId: string | null = null;

  private dataService = inject(DataService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private notesSubscription: Subscription | null = null;

  private searchSubject = new Subject<string>();
  notes: WritableSignal<Note[]> = signal([]);
  isLoading: WritableSignal<boolean> = signal(false);
  error: WritableSignal<string | null> = signal(null);

  // Estado para o modal de edição/criação
  isNoteModalVisible: WritableSignal<boolean> = signal(false);
  currentNote: WritableSignal<Partial<Note>> = signal({});
  isEditing: WritableSignal<boolean> = signal(false);
  isSavingNote: WritableSignal<boolean> = signal(false); // Novo estado para o spinner do modal de edição/criação

  // Estado para o modal de confirmação de exclusão
  showDeleteConfirmationModal: WritableSignal<boolean> = signal(false);
  noteToDelete: WritableSignal<{ id: string; title: string } | null> = signal(null);

  // Estado para a busca
  searchTerm: WritableSignal<string> = signal('');

  // Estado para o modo de visualização
  viewMode: WritableSignal<ViewMode> = signal('grid');

  // Signal computado para filtrar as notas
  filteredNotes: Signal<Note[]> = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) {
      return this.notes();
    }
    return this.notes().filter(note => note.title.toLowerCase().includes(term) || note.content.toLowerCase().includes(term));
  });

  ngOnInit() {
    const savedViewMode = localStorage.getItem('notesViewMode') as ViewMode;
    if (savedViewMode && (savedViewMode === 'grid' || savedViewMode === 'list')) {
      this.viewMode.set(savedViewMode);
    }

    this.searchSubject.pipe(debounceTime(300)).subscribe(searchTerm => {
      this.searchTerm.set(searchTerm);
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['notebookId'] && this.notebookId) {
      this.fetchNotes();
    }
  }

  ngOnDestroy() {
    this.notesSubscription?.unsubscribe();
    this.searchSubject.unsubscribe();
  }

  fetchNotes() {
    if (!this.notebookId) return;

    this.isLoading.set(true);
    this.error.set(null);
    this.notesSubscription?.unsubscribe();

    this.notesSubscription = this.dataService.getNotes(this.notebookId).subscribe({
      next: (notes) => {
        this.notes.set(notes);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Erro ao buscar notas:', err);
        this.error.set('Não foi possível carregar as notas.');
        this.isLoading.set(false);
      }
    });
  }

  openNoteEditor(note: Note) {
    if (this.notebookId) {
      this.router.navigate(['/notebooks', this.notebookId, 'notes', note.id]);
    }
  }

  // Abre o modal de confirmação de exclusão
  deleteNote(noteId: string, noteTitle: string) {
    if (!this.notebookId) return;

    this.noteToDelete.set({ id: noteId, title: noteTitle });
    this.showDeleteConfirmationModal.set(true);
  }

  // Confirma a exclusão da nota
  async confirmDeleteNote() {
    const note = this.noteToDelete();
    if (!note || !this.notebookId) {
      this.cancelDeleteNote();
      return;
    }

    this.showDeleteConfirmationModal.set(false); // Fecha o modal
    try {
      await this.dataService.deleteNote(this.notebookId, note.id);
      this.notificationService.showSuccess(`Nota "${note.title}" deletada com sucesso.`);
      // A lista será atualizada automaticamente pelo listener do Firestore
    } catch (error) {
      console.error('Erro ao deletar a nota:', error);
      // Opcional: mostrar uma notificação de erro para o usuário
    } finally {
      // Limpa o estado da nota a ser deletada
      this.noteToDelete.set(null);
    }
  }

  // Cancela a exclusão da nota
  cancelDeleteNote() {
    this.showDeleteConfirmationModal.set(false);
    this.noteToDelete.set(null);
  }

  // Abre o modal para criar uma nova nota
  openCreateNoteModal() {
    this.isEditing.set(false);
    this.currentNote.set({ title: '', content: '' });
    this.isSavingNote.set(false); // Reset saving state
    this.isNoteModalVisible.set(true);
  }

  // Fecha o modal de edição/criação
  closeNoteModal() {
    this.isNoteModalVisible.set(false);
    this.currentNote.set({}); // Limpa a nota atual
  }

  // Salva (cria ou atualiza) a nota
  async saveNote(noteData: Partial<Note>) {
    if (!this.notebookId) return;

    this.isSavingNote.set(true);
    try {
      if (this.isEditing() && noteData.id) {
        await this.dataService.updateNote(this.notebookId, noteData.id, { title: noteData.title!, content: noteData.content! }); // Assuming updateNote expects an object
      } else {
        await this.dataService.createNote(this.notebookId, noteData.title!, noteData.content!);
      }
      this.closeNoteModal();
    } catch (error) {
      console.error('Erro ao salvar nota:', error);
      // TODO: Exibir mensagem de erro para o usuário no modal ou componente principal
    } finally {
      this.isSavingNote.set(false);
    }
  }

  onSearch(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.searchSubject.next(inputElement.value);
  }

  setViewMode(mode: ViewMode) {
    this.viewMode.set(mode);
    localStorage.setItem('notesViewMode', mode);
  }
}