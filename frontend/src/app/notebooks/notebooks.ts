import { Component, inject, OnInit, signal, WritableSignal, computed, Signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate, keyframes } from '@angular/animations';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { AuthService } from '../services/auth';
import { RouterOutlet } from '@angular/router';
import { NoteColumn } from '../note-column/note-column';
import { DataService, Notebook, Note, SortBy, SortDirection } from '../services/data.service';
import { NotebookService } from '../services/notebook.service';
import { NotificationService } from '../services/notification.service';
import { HighlightPipe } from '../pipes/highlight.pipe';
import { Modal } from '../modal/modal';
import { LucideAngularModule } from 'lucide-angular';


const SORT_PREFERENCE_KEY = 'notebooksSortPreference';

@Component({
  selector: 'app-cadernos',
  standalone: true,
  imports: [NoteColumn, HighlightPipe, FormsModule, Modal, LucideAngularModule, RouterOutlet],
  templateUrl: './notebooks.html',
  styleUrl: './notebooks.css',
  animations: [
    trigger('itemAnimation', [
      // Animação para quando um item entra na lista (é adicionado)
      transition(':enter', [
        animate('400ms ease-out', keyframes([
          // 1. Começa invisível, um pouco menor e acima da posição final
          style({ opacity: 0, transform: 'scale(0.9) translateY(-20px)', offset: 0 }),
          // 2. Aos 70% do tempo, fica visível e ultrapassa um pouco a posição/tamanho final
          style({ opacity: 1, transform: 'scale(1.05) translateY(5px)', offset: 0.7 }),
          // 3. No final, assenta-se na posição e tamanho corretos
          style({ opacity: 1, transform: 'scale(1) translateY(0)', offset: 1.0 })
        ]))
      ]),
      // Animação para quando um item sai da lista (é removido)
      transition(':leave', [
        style({ transform: 'translateY(0)', opacity: 1 }),
        animate('200ms ease-in', style({ transform: 'translateX(20px)', opacity: 0 }))
      ])
    ])
  ]
})
export class Notebooks implements OnInit {

  private authService = inject(AuthService);
  private dataService = inject(DataService);
  notebookService = inject(NotebookService);
  private notificationService = inject(NotificationService);
  
  // Signals para o estado local do componente (UI)
  selectedNotebookId: WritableSignal<string | null> = signal(null);
  selectedNoteId: WritableSignal<string | null> = signal(null);
  deletingNotebookIds: WritableSignal<Set<string>> = signal(new Set());
  showDeleteModal: WritableSignal<boolean> = signal(false);
  notebookToDelete: WritableSignal<{ id: string; name: string } | null> = signal(null);
  showCreateRenameModal: WritableSignal<boolean> = signal(false);
  notebookToRename: WritableSignal<{ id: string; name: string } | null> = signal(null);
  modalMode: WritableSignal<'create' | 'rename'> = signal('create');
  newNotebookName: WritableSignal<string> = signal('');
  sortOption: WritableSignal<{ by: SortBy, direction: SortDirection }> = signal({ by: 'createdAt', direction: 'desc' });
  searchTerm: WritableSignal<string> = signal('');
  isNoteOpen: WritableSignal<boolean> = signal(false);
  isNavigating: WritableSignal<boolean> = signal(false); // Novo signal para o estado de navegação

  // Signal computado para filtrar os cadernos
  filteredNotebooks: Signal<Notebook[]> = computed(() => {
    const term = this.searchTerm().toLowerCase();
    // Usa o signal de cadernos do serviço
    const allNotebooks = this.notebookService.notebooks();

    if (!term) return allNotebooks;

    return allNotebooks.filter(notebook => notebook.name.toLowerCase().includes(term));
  });

  constructor() {
    // Efeito para re-selecionar o primeiro caderno quando a lista é atualizada
    // e nenhum caderno está selecionado.
    effect(() => {
      const notebooks = this.notebookService.notebooks();
      if (notebooks.length > 0 && !this.selectedNotebookId()) {
        this.selectNotebook(notebooks[0].id);
      }
    });
  }

  ngOnInit() {
    // Carrega a preferência de ordenação salva no localStorage
    const savedSort = localStorage.getItem(SORT_PREFERENCE_KEY);
    if (savedSort) {
      try {
        const parsedSort = JSON.parse(savedSort);
        if (parsedSort.by && parsedSort.direction) {
          this.sortOption.set(parsedSort);
        }
      } catch (e) {
        console.error('Erro ao carregar preferência de ordenação do localStorage', e);
        localStorage.removeItem(SORT_PREFERENCE_KEY);
      }
    }
  }

  retryFetchNotebooks() {
    console.log('Tentando buscar cadernos novamente...');
    const { by, direction } = this.sortOption();
    this.notebookService.fetchNotebooks(by, direction);
  }

  changeSortOrder(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const [by, direction] = selectElement.value.split('-') as [SortBy, SortDirection];
    const newSortOption = { by, direction };
    this.sortOption.set(newSortOption);

    // Salva a nova preferência no localStorage
    localStorage.setItem(SORT_PREFERENCE_KEY, JSON.stringify(newSortOption));
  }





  onSearch(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.searchTerm.set(inputElement.value);
  }

  clearSearch(inputElement: HTMLInputElement) {
    this.searchTerm.set('');
    inputElement.focus(); // Devolve o foco para o campo de busca
  }

  openCreateModal() {
    this.modalMode.set('create');
    this.newNotebookName.set('');
    this.showCreateRenameModal.set(true);
  }

  openRenameModal(id: string, name: string) {
    this.modalMode.set('rename');
    this.notebookToRename.set({ id, name });
    this.newNotebookName.set(name);
    this.showCreateRenameModal.set(true);
  }

  closeCreateRenameModal() {
    this.notebookToRename.set(null);
    this.showCreateRenameModal.set(false);
  }

  async handleSaveNotebook() {
    const name = this.newNotebookName().trim();
    if (name === '') return;

    if (this.modalMode() === 'create') {
      await this.createNotebook(name);
    } else if (this.notebookToRename()) {
      await this.updateNotebook(this.notebookToRename()!.id, name);
    }
    this.closeCreateRenameModal();
  }

  private async createNotebook(name: string) {
    if (!this.authService.getCurrentUserId()) {
      this.notificationService.showError('Você precisa estar logado para criar um caderno.');
      return;
    }

    try {
      const newId = await this.dataService.createNotebook(name);
      this.notificationService.showSuccess(`Caderno "${name}" criado com sucesso.`);
      // Re-busca os cadernos para atualizar a lista
      this.notebookService.fetchNotebooks();
    } catch (error) {
      console.error('Erro ao criar o caderno:', error);
      this.notificationService.showError(`Erro ao criar o caderno "${name}".`);
    }
  }

  async updateNotebook(id: string, newName: string) {
    if (!this.authService.getCurrentUserId()) {
      this.notificationService.showError('Você precisa estar logado para atualizar um caderno.');
      return;
    }

    try {
      await this.dataService.updateNotebook(id, newName);
      this.notificationService.showSuccess(`Caderno renomeado para "${newName}".`);
      // Re-busca os cadernos para atualizar a lista
      this.notebookService.fetchNotebooks();
    } catch (error) {
      console.error('Erro ao atualizar o caderno:', error);
      this.notificationService.showError(`Erro ao renomear o caderno.`);
    }
  }

  async deleteNotebook(id: string) {
    if (!this.authService.getCurrentUserId()) {
      this.notificationService.showError('Você precisa estar logado para deletar um caderno.');
      return;
    }

    try {
      await this.dataService.deleteNotebook(id);
       // Re-busca os cadernos para atualizar a lista
      this.notebookService.fetchNotebooks();
    } catch (error) {
      console.error('Erro ao deletar o caderno:', error);
    }
  }

  async renameNotebook(id: string, currentName: string) {
    const newName = prompt(`Renomear caderno "${currentName}":`, currentName);
    
    if (newName === null) { // Usuário clicou em cancelar
      console.log('Renomear caderno cancelado.');
      return;
    }

    const trimmedNewName = newName.trim();
    if (trimmedNewName === '') {
      this.notificationService.showError('O nome do caderno não pode ser vazio.');
      return;
    }
    if (trimmedNewName === currentName) {
      console.log('O novo nome é o mesmo que o nome atual. Nenhuma alteração feita.');
      return;
    }
    await this.updateNotebook(id, trimmedNewName);
  }

  openDeleteModal(id: string, name: string) {
    this.notebookToDelete.set({ id, name });
    this.showDeleteModal.set(true);
  }

  closeDeleteModal() {
    this.notebookToDelete.set(null);
    this.showDeleteModal.set(false);
  }

  async confirmDeleteNotebook() {
    const notebook = this.notebookToDelete();
    if (!notebook) return;

    this.deletingNotebookIds.update(ids => ids.add(notebook.id));
    this.closeDeleteModal();

    try {
      if (this.selectedNotebookId() === notebook.id) {
        this.selectedNotebookId.set(null);
        this.selectedNoteId.set(null);
      }
      await this.deleteNotebook(notebook.id);
      this.notificationService.showSuccess(`Caderno "${notebook.name}" deletado com sucesso.`);
    } catch (error) {
      console.error(`Erro ao deletar o caderno ${notebook.name}:`, error);
      this.notificationService.showError(`Ocorreu um erro ao deletar o caderno "${notebook.name}".`);
    } finally {
      this.deletingNotebookIds.update(ids => {
        ids.delete(notebook.id);
        return ids;
      });
    }
  }

  selectNotebook(id: string) {
    this.selectedNotebookId.set(id);
    this.selectedNoteId.set(null); // Reseta a nota selecionada ao trocar de caderno
  }

  onNoteSelected(noteId: string) {
    this.selectedNoteId.set(noteId);
  }
}