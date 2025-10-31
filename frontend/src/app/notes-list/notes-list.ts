import { Component, Input, OnChanges, OnDestroy, SimpleChanges, inject, signal, WritableSignal, computed, Signal, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { DataService, Note } from '../services/data.service';
import { Subscription, debounceTime, Subject } from 'rxjs';
import { HighlightPipe } from '../pipes/highlight.pipe';
import { LucideAngularModule } from 'lucide-angular';
import { ConfirmationModalComponent } from './modals/confirmation-modal.component';
import { MoveNoteModalComponent } from './modals/move-note-modal/move-note-modal.component';
import { NotificationService } from '../services/notification.service';
import { Notebook } from '../services/data.service';

@Component({
  selector: 'app-notes-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HighlightPipe,
    LucideAngularModule, // Necessário para <lucide-icon>
    ConfirmationModalComponent, // Necessário para <app-confirmation-modal>
    MoveNoteModalComponent
  ],
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

  // Estado para o menu de opções da nota
  isNoteMenuOpen: WritableSignal<string | null> = signal(null);

  // Estado para o modal de mover nota
  showMoveNoteModal: WritableSignal<boolean> = signal(false);
  noteToMove: WritableSignal<Note | null> = signal(null);
  notebooks: WritableSignal<Notebook[]> = signal([]);

  // Signal computado para filtrar e ordenar as notas
  filteredNotes: Signal<Note[]> = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const notesToSort = this.notes();

    // Ordena as notas
    const sortedNotes = [...notesToSort].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      // Mantém a ordenação original (por data) se o status de 'pinned' for o mesmo
      return 0;
    });

    if (!term) {
      return sortedNotes;
    }

    return sortedNotes.filter(note => note.title.toLowerCase().includes(term) || note.content.toLowerCase().includes(term));
  });

  ngOnInit() {
    this.searchSubject.pipe(debounceTime(300)).subscribe(searchTerm => {
      this.searchTerm.set(searchTerm);
    });
    this.fetchNotebooks();
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

  fetchNotebooks() {
    this.dataService.getNotebooks('name', 'asc').subscribe({
      next: (notebooks) => this.notebooks.set(notebooks),
      error: (err) => console.error('Erro ao buscar cadernos:', err)
    });
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

  async togglePin(note: Note) {
    if (!this.notebookId) return;

    try {
      await this.dataService.updateNotePinnedStatus(this.notebookId, note.id, !note.isPinned);
      // A UI será atualizada automaticamente pelo onSnapshot do DataService
    } catch (error) {
      console.error('Erro ao fixar/desafixar a nota:', error);
      this.notificationService.showError('Erro ao atualizar a nota.');
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    // Se o menu estiver aberto e o clique for fora de um botão de menu, fecha o menu
    const target = event.target as HTMLElement;
    if (this.isNoteMenuOpen() && !target.closest('.menu-button')) {
      this.closeNoteMenu();
    }
  }

  toggleNoteMenu(noteId: string, event: MouseEvent) {
    event.stopPropagation();
    this.isNoteMenuOpen.set(this.isNoteMenuOpen() === noteId ? null : noteId);
  }

  closeNoteMenu() {
    this.isNoteMenuOpen.set(null);
  }

  // --- Lógica para Mover Nota ---

  openMoveNoteModal(note: Note) {
    this.noteToMove.set(note);
    this.showMoveNoteModal.set(true);
    this.closeNoteMenu();
  }

  closeMoveNoteModal() {
    this.showMoveNoteModal.set(false);
    this.noteToMove.set(null);
  }

  async confirmMoveNote(toNotebookId: string) {
    const note = this.noteToMove();
    if (!note || !this.notebookId) {
      this.closeMoveNoteModal();
      return;
    }

    try {
      await this.dataService.moveNote(note.id, this.notebookId, toNotebookId);
      this.notificationService.showSuccess(`Nota "${note.title}" movida com sucesso.`);
    } catch (error) {
      console.error('Erro ao mover a nota:', error);
      this.notificationService.showError('Erro ao mover a nota.');
    } finally {
      this.closeMoveNoteModal();
    }
  }
}