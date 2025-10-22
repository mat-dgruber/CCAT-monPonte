import { Component, inject, OnInit, OnDestroy, signal, WritableSignal, effect, computed, Signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate, keyframes } from '@angular/animations'; // Importa o NotesList
import { AuthService } from '../services/auth';
import { Subscription } from 'rxjs';
import { NotesList } from '../notes-list/notes-list'; // Importa o NotesList
import { DataService, Notebook, SortBy, SortDirection } from '../services/data.service';
import { HighlightPipe } from '../pipes/highlight.pipe';
import { Modal } from '../modal/modal';

const SORT_PREFERENCE_KEY = 'notebooksSortPreference';

@Component({
  selector: 'app-cadernos',
  standalone: true,
  imports: [NotesList, HighlightPipe, FormsModule, Modal],
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
export class Notebooks implements OnInit, OnDestroy {

  private authService = inject(AuthService);
  private dataService = inject(DataService);
  private authSubscription: Subscription | null = null;
  private notebooksSubscription: Subscription | null = null;
  
  userId: WritableSignal<string | null> = signal(null);
  notebooks: WritableSignal<Notebook[]> = signal([]);
  selectedNotebookId: WritableSignal<string | null> = signal(null);
  deletingNotebookIds: WritableSignal<Set<string>> = signal(new Set());
  notification: WritableSignal<{ message: string; type: 'success' | 'error' } | null> = signal(null);
  isLoading: WritableSignal<boolean> = signal(false);
  showDeleteModal: WritableSignal<boolean> = signal(false);
  notebookToDelete: WritableSignal<{ id: string; name: string } | null> = signal(null);
  showCreateRenameModal: WritableSignal<boolean> = signal(false);
  notebookToRename: WritableSignal<{ id: string; name: string } | null> = signal(null);
  modalMode: WritableSignal<'create' | 'rename'> = signal('create');
  newNotebookName: WritableSignal<string> = signal('');
  loadingError: WritableSignal<boolean> = signal(false);
  sortOption: WritableSignal<{ by: SortBy, direction: SortDirection }> = signal({ by: 'createdAt', direction: 'desc' });
  searchTerm: WritableSignal<string> = signal('');

  // Signal computado para filtrar os cadernos
  filteredNotebooks: Signal<Notebook[]> = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const allNotebooks = this.notebooks();

    if (!term) return allNotebooks;

    return allNotebooks.filter(notebook => notebook.name.toLowerCase().includes(term));
  });

  constructor() {
    // Reage a mudanças no userId ou na ordenação para buscar os cadernos.
    effect(() => {
      this.userId(); // Depende do userId
      this.sortOption(); // Depende da ordenação
      this.fetchNotebooks();
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

    // Inscreve-se no authState$ para ouvir mudanças de autenticação.
    this.authSubscription = this.authService.authState$.subscribe(user => {
      if (user) {
        this.userId.set(user.uid);
      } else {
        this.userId.set(null);
        this.notebooks.set([]);
        this.selectedNotebookId.set(null);
        this.isLoading.set(false);
        this.loadingError.set(false);
      }
    });
  }

  ngOnDestroy() {
    // 5. É fundamental cancelar a inscrição para evitar vazamentos de memória
    // quando o componente for destruído.
    this.authSubscription?.unsubscribe();
    this.notebooksSubscription?.unsubscribe();
  }

  private fetchNotebooks() {
    if (!this.userId()) {
      return; // Não busca se não houver usuário
    }

    this.isLoading.set(true);
    this.loadingError.set(false);

    const { by, direction } = this.sortOption();
    this.notebooksSubscription = this.dataService.getNotebooks(by, direction).subscribe({
      next: (notebooks) => {
        this.notebooks.set(notebooks);
        if (notebooks.length > 0 && !this.selectedNotebookId()) {
          this.selectNotebook(notebooks[0].id);
        }
        console.log('Cadernos atualizados:', this.notebooks());
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Erro ao buscar cadernos:', error);
        this.showNotification('Não foi possível carregar os cadernos.', 'error');
        this.isLoading.set(false);
        this.loadingError.set(true);
      }
    });
  }

  retryFetchNotebooks() {
    console.log('Tentando buscar cadernos novamente...');
    this.fetchNotebooks();
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
    // 1. Garante que temos um usuário logado.
    if (!this.userId()) {
      this.showNotification('Você precisa estar logado para criar um caderno.', 'error');
      return;
    }

    try {
      // Delega a criação para o DataService
      const newId = await this.dataService.createNotebook(name);
      console.log('Caderno criado com sucesso! ID:', newId);
      this.showNotification(`Caderno "${name}" criado com sucesso.`, 'success');
    } catch (error) {
      console.error('Erro ao criar o caderno:', error);
      this.showNotification(`Erro ao criar o caderno "${name}".`, 'error');
    }
  }

  async updateNotebook(id: string, newName: string) {
    // 1. Garante que temos um usuário logado.
    if (!this.userId()) {
      this.showNotification('Você precisa estar logado para atualizar um caderno.', 'error');
      return;
    }

    try {
      // Delega a atualização para o DataService
      await this.dataService.updateNotebook(id, newName);
      console.log('Caderno atualizado com sucesso! ID:', id);
      this.showNotification(`Caderno renomeado para "${newName}".`, 'success');
    } catch (error) {
      console.error('Erro ao atualizar o caderno:', error);
      this.showNotification(`Erro ao renomear o caderno.`, 'error');
    }
  }

  async deleteNotebook(id: string) {
    // 1. Garante que temos um usuário logado.
    if (!this.userId()) {
      this.showNotification('Você precisa estar logado para deletar um caderno.', 'error');
      return;
    }

    try {
      // Delega a exclusão para o DataService
      await this.dataService.deleteNotebook(id);
      console.log('Caderno deletado com sucesso! ID:', id);
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
      this.showNotification('O nome do caderno não pode ser vazio.', 'error');
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
      }
      await this.deleteNotebook(notebook.id);
      this.showNotification(`Caderno "${notebook.name}" deletado com sucesso.`, 'success');
    } catch (error) {
      console.error(`Erro ao deletar o caderno ${notebook.name}:`, error);
      this.showNotification(`Ocorreu um erro ao deletar o caderno "${notebook.name}".`, 'error');
    } finally {
      this.deletingNotebookIds.update(ids => {
        ids.delete(notebook.id);
        return ids;
      });
    }
  }

  selectNotebook(id: string) {
    this.selectedNotebookId.set(id);
    console.log('Caderno selecionado:', this.selectedNotebookId());
  }

  private showNotification(message: string, type: 'success' | 'error') {
    this.notification.set({ message, type });
    setTimeout(() => {
      this.notification.set(null);
    }, 3000); // A notificação desaparecerá após 3 segundos
  }
}