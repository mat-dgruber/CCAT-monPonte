import { Component, inject, OnInit, OnDestroy, signal, WritableSignal, effect, computed, Signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate, keyframes } from '@angular/animations'; // Importa o NotesList
import { AuthService } from '../services/auth';
import { Subscription } from 'rxjs';
import { NotesList } from '../notes-list/notes-list'; // Importa o NotesList
import { DataService, Notebook, SortBy, SortDirection } from '../services/data.service';
import { HighlightPipe } from '../pipes/highlight.pipe';

const SORT_PREFERENCE_KEY = 'notebooksSortPreference';

@Component({
  selector: 'app-cadernos',
  standalone: true,
  imports: [NotesList, HighlightPipe, FormsModule],
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
  
  userId: string | null = null;
  notebooks: WritableSignal<Notebook[]> = signal([]);
  selectedNotebookId: WritableSignal<string | null> = signal(null);
  deletingNotebookIds: WritableSignal<Set<string>> = signal(new Set());
  notification: WritableSignal<{ message: string; type: 'success' | 'error' } | null> = signal(null);
  isLoading: WritableSignal<boolean> = signal(false);
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
    // Reage a mudanças na ordenação para buscar os cadernos novamente.
    effect(() => {
      this.sortOption();
      this.fetchNotebooks();
    });
  }

  ngOnInit() {
    // Carrega a preferência de ordenação salva no localStorage
    const savedSort = localStorage.getItem(SORT_PREFERENCE_KEY);
    if (savedSort) {
      try {
        const parsedSort = JSON.parse(savedSort);
        // Validação básica para garantir que os dados são válidos
        if (parsedSort.by && parsedSort.direction) {
          this.sortOption.set(parsedSort);
        }
      } catch (e) {
        console.error('Erro ao carregar preferência de ordenação do localStorage', e);
        localStorage.removeItem(SORT_PREFERENCE_KEY); // Limpa dados corrompidos
      }
    }

    // 1. Inscreve-se no authState$ para ouvir mudanças de autenticação.
    this.authSubscription = this.authService.authState$.subscribe(user => {
      // 2. Verifica se o objeto 'user' existe (se o usuário está logado).
      if (user) {
        this.userId = user.uid; // O userId é definido aqui
      } else {
        // 4. Se não houver usuário (logout), limpa o userId.
        this.userId = null;
        this.notebooks.set([]); // Limpa a lista de cadernos
        this.selectedNotebookId.set(null); // Limpa a seleção
        this.isLoading.set(false);
        this.loadingError.set(false);
        console.log('Usuário deslogado.');
      }
      // A busca é acionada aqui, após a mudança de estado de autenticação
      this.fetchNotebooks();
    });
  }

  ngOnDestroy() {
    // 5. É fundamental cancelar a inscrição para evitar vazamentos de memória
    // quando o componente for destruído.
    this.authSubscription?.unsubscribe();
    this.notebooksSubscription?.unsubscribe();
  }

  private fetchNotebooks() {
    if (!this.userId) {
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

  async createNewNotebook() {
    const name = prompt('Digite o nome do novo caderno:');
    if (name && name.trim() !== '') {
      await this.createNotebook(name.trim());
    }
  }

  private async createNotebook(name: string) {
    // 1. Garante que temos um usuário logado.
    if (!this.userId) {
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
    if (!this.userId) {
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
    if (!this.userId) {
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

  async confirmDeleteNotebook(id: string, name: string) {
    const confirmation = confirm(`Tem certeza que deseja deletar o caderno "${name}"?\n\nATENÇÃO: Todas as notas dentro dele serão perdidas permanentemente.`);
    
    if (confirmation) {
      // Adiciona o ID ao conjunto de cadernos que estão sendo deletados
      this.deletingNotebookIds.update(ids => ids.add(id));
      try {
        // Se o caderno deletado for o que está selecionado, limpa a seleção.
        if (this.selectedNotebookId() === id) {
          this.selectedNotebookId.set(null);
        }
        await this.deleteNotebook(id);
        this.showNotification(`Caderno "${name}" deletado com sucesso.`, 'success');
      } catch (error) {
        console.error(`Erro ao deletar o caderno ${name}:`, error);
        this.showNotification(`Ocorreu um erro ao deletar o caderno "${name}".`, 'error');
      } finally {
        // Remove o ID do conjunto, independentemente do resultado
        this.deletingNotebookIds.update(ids => {
          ids.delete(id);
          return ids;
        });
      }
    } else {
      console.log('Deleção do caderno cancelada.');
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