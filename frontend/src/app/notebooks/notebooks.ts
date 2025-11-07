import { Component, inject, OnInit, OnDestroy, signal, WritableSignal, computed, Signal, effect, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate, keyframes, state } from '@angular/animations';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { AuthService } from '../services/auth';
import { Router, ActivatedRoute, NavigationEnd, RouterOutlet } from '@angular/router';
import { NoteColumn } from '../note-column/note-column';
import { DataService, Notebook, SortBy, SortDirection } from '../services/data.service';
import { Note } from '../services/note.service';
import { NotebookService } from '../services/notebook.service';
import { NotificationService } from '../services/notification.service';
import { HighlightPipe } from '../pipes/highlight.pipe';
import { Modal } from '../modal/modal';
import { LucideAngularModule } from 'lucide-angular';
import { Subscription, Subject } from 'rxjs';
import { filter, debounceTime } from 'rxjs/operators';
import { ResponsiveService } from '../services/responsive';


const SORT_PREFERENCE_KEY = 'notebooksSortPreference';

@Component({
  selector: 'app-cadernos',
  standalone: true,
  imports: [NoteColumn, HighlightPipe, FormsModule, Modal, LucideAngularModule, RouterOutlet],
  templateUrl: './notebooks.html',
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
    ]),
    trigger('routeAnimation', [
      transition(':enter', [
        style({ position: 'relative', opacity: 0, transform: 'translateY(10px)' }),
        animate('250ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('favoriteAnimation', [
      // Animação para quando um item se torna favorito
      transition('false => true', [
        animate('400ms ease-in-out', keyframes([
          style({ transform: 'scale(1)', offset: 0 }),
          style({ transform: 'scale(1.1)', boxShadow: '0 0 10px #fbbf24', offset: 0.5 }), // Efeito de pulso e brilho amarelo
          style({ transform: 'scale(1)', offset: 1.0 })
        ]))
      ]),
      // Animação para quando um item DEIXA de ser favorito
      transition('true => false', [
        // A animação de "deslizar" será tratada pelo reordenamento da lista.
        // Podemos manter um efeito sutil aqui ou remover. Por ora, vamos manter.
        animate('200ms ease-out', style({ opacity: 0.7, transform: 'scale(0.95)' }))
      ])
    ])
  ]
})
export class Notebooks implements OnInit {

  private authService = inject(AuthService);
  private dataService = inject(DataService);
  notebookService = inject(NotebookService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  responsiveService = inject(ResponsiveService);
  private subscriptions = new Subscription();
  private searchSubject = new Subject<string>();

  
  // Signals para o estado local do componente (UI)
  selectedNotebookId: WritableSignal<string | null> = signal(null);
  currentNoteId: WritableSignal<string | null> = signal(null);
  selectedNoteId: WritableSignal<string | null> = signal(null);
  deletingNotebookIds: WritableSignal<Set<string>> = signal(new Set());
  showDeleteModal: WritableSignal<boolean> = signal(false);
  notebookToDelete: WritableSignal<{ id: string; name: string } | null> = signal(null);
  showCreateRenameModal: WritableSignal<boolean> = signal(false);
  notebookToRename: WritableSignal<{ id: string; name: string } | null> = signal(null);
  modalMode: WritableSignal<'create' | 'rename'> = signal('create');
  newNotebookName: WritableSignal<string> = signal('');
  newNotebookColor: WritableSignal<string> = signal('#FFFFFF');
  sortOption: WritableSignal<{ by: SortBy, direction: SortDirection }> = signal({ by: 'createdAt', direction: 'desc' });
  searchTerm: WritableSignal<string> = signal('');
  isNoteOpen: WritableSignal<boolean> = signal(false);
  isNavigating: WritableSignal<boolean> = signal(false); // Novo signal para o estado de navegação

  availableColors: string[] = [
    '#FFFFFF', '#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF'
  ];

  // Signal computado para filtrar os cadernos
  filteredNotebooks: Signal<Notebook[]> = computed(() => {
    // 1. Pega os valores atuais dos signals de dependência
    const term = this.searchTerm().toLowerCase();
    const notebooks = this.notebookService.notebooks();
    const sort = this.sortOption();

    // 2. Filtra os cadernos com base no termo de busca
    const filtered = term
      ? notebooks.filter(notebook => notebook.name.toLowerCase().includes(term))
      : [...notebooks]; // Cria uma cópia para não modificar o array original

    // 3. Ordena a lista filtrada
    return filtered.sort((a, b) => {
      const valA = sort.by === 'name' ? a.name.toLowerCase() : a.createdAt?.toMillis() || 0;
      const valB = sort.by === 'name' ? b.name.toLowerCase() : b.createdAt?.toMillis() || 0;

      if (valA < valB) {
        return sort.direction === 'asc' ? -1 : 1;
      }
      if (valA > valB) {
        return sort.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  });

  favoriteNotebooks: Signal<Notebook[]> = computed(() => 
    this.filteredNotebooks().filter(n => n.isFavorite)
  );

  regularNotebooks: Signal<Notebook[]> = computed(() =>
    this.filteredNotebooks().filter(n => !n.isFavorite)
  );

  // NOVO: Signal computado para uma lista única, ordenada e agrupada
  sortedAndGroupedNotebooks: Signal<Notebook[]> = computed(() => {
    const notebooks = this.filteredNotebooks();
    return [...notebooks].sort((a, b) => {
      // 1. Prioridade máxima: Favoritos primeiro
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;

      // 2. Se ambos são favoritos ou ambos não são, aplica a ordenação do usuário
      const sort = this.sortOption();
      const valA = sort.by === 'name' ? a.name.toLowerCase() : a.createdAt?.toMillis() || 0;
      const valB = sort.by === 'name' ? b.name.toLowerCase() : b.createdAt?.toMillis() || 0;

      if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  });

  constructor(private cdr: ChangeDetectorRef) {
    // O efeito que re-selecionava o primeiro caderno foi removido
    // para evitar condições de corrida e comportamento inesperado.
    // A seleção de um caderno agora é uma ação explícita do usuário.
  }

  ngOnInit() {
    // Assinatura para sincronizar o estado da rota com os signals
    const routeSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      let route = this.route.firstChild;
      let foundNotebookId = null;
      let foundNoteId = null;

      while (route) {
        if (route.snapshot.paramMap.has('noteId')) {
          foundNoteId = route.snapshot.paramMap.get('noteId');
        }
        if (route.snapshot.paramMap.has('notebookId')) {
          foundNotebookId = route.snapshot.paramMap.get('notebookId');
        }
        route = route.firstChild;
      }
      this.currentNoteId.set(foundNoteId);
      
      // Apenas atualiza o caderno selecionado se um ID for encontrado na rota.
      // Isso evita que a seleção manual do usuário seja sobrescrita com 'null'
      // ao navegar para uma rota que não contém um ID de caderno.
      if (foundNotebookId) {
        this.selectedNotebookId.set(foundNotebookId);
      }
      this.cdr.detectChanges();
    });

    this.subscriptions.add(routeSub);

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

    // Assinatura para a busca com debounce
    const searchSub = this.searchSubject.pipe(
      debounceTime(300) // Espera 300ms após a última tecla digitada
    ).subscribe(term => {
      this.searchTerm.set(term);
    });
    this.subscriptions.add(searchSub);
  }

  retryFetchNotebooks() {
    console.log('Tentando buscar cadernos novamente...');
  }

  changeSortOrder(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const [by, direction] = selectElement.value.split('-') as [SortBy, SortDirection];
    const newSortOption = { by, direction };
    this.sortOption.set(newSortOption);

    // Não é mais necessário chamar o fetchNotebooks aqui.
    // A mudança no signal 'sortOption' fará com que o 'filteredNotebooks'
    // seja recalculado automaticamente.

    // Salva a nova preferência no localStorage
    localStorage.setItem(SORT_PREFERENCE_KEY, JSON.stringify(newSortOption));
  }





  onSearch(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.searchSubject.next(inputElement.value);
  }

  clearSearch(inputElement: HTMLInputElement) {
    this.searchTerm.set('');
    inputElement.focus(); // Devolve o foco para o campo de busca
  }

  openCreateModal() {
    this.modalMode.set('create');
    this.newNotebookName.set('');
    this.newNotebookColor.set('#FFFFFF');
    this.showCreateRenameModal.set(true);
  }

  openRenameModal(id: string, name: string, color?: string) {
    this.modalMode.set('rename');
    this.notebookToRename.set({ id, name });
    this.newNotebookName.set(name);
    this.newNotebookColor.set(color || '#FFFFFF');
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
      await this.createNotebook(name, this.newNotebookColor());
    } else if (this.notebookToRename()) {
      await this.updateNotebook(this.notebookToRename()!.id, name);
      await this.updateNotebookColor(this.notebookToRename()!.id, this.newNotebookColor());
    }
    this.closeCreateRenameModal();
  }

  private async createNotebook(name: string, color: string) {
    if (!this.authService.getCurrentUserId()) {
      this.notificationService.showError('Você precisa estar logado para criar um caderno.');
      return;
    }

    try {
      const newId = await this.dataService.createNotebook(name, color);
      this.notificationService.showSuccess(`Caderno "${name}" criado com sucesso.`);
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
    } catch (error) {
      console.error('Erro ao atualizar o caderno:', error);
      this.notificationService.showError(`Erro ao renomear o caderno.`);
    }
  }

  async updateNotebookColor(id: string, color: string) {
    if (!this.authService.getCurrentUserId()) {
      this.notificationService.showError('Você precisa estar logado para atualizar um caderno.');
      return;
    }

    try {
      await this.dataService.updateNotebookColor(id, color);
      this.notificationService.showSuccess(`Cor do caderno atualizada.`);
      // A lista será atualizada reativamente
    } catch (error) {
      console.error('Erro ao atualizar a cor do caderno:', error);
      this.notificationService.showError(`Erro ao atualizar a cor do caderno.`);
    }
  }

  async deleteNotebook(id: string) {
    if (!this.authService.getCurrentUserId()) {
      this.notificationService.showError('Você precisa estar logado para deletar um caderno.');
      return;
    }

    try {
      await this.dataService.deleteNotebook(id);
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

  async toggleFavorite(notebook: Notebook) {
    if (!this.authService.getCurrentUserId()) {
      this.notificationService.showError('Você precisa estar logado para favoritar um caderno.');
      return;
    }

    const newFavoriteStatus = !notebook.isFavorite;

    try {
      await this.dataService.updateNotebookFavoriteStatus(notebook.id, newFavoriteStatus);
      const message = newFavoriteStatus 
        ? `Caderno "${notebook.name}" adicionado aos favoritos.`
        : `Caderno "${notebook.name}" removido dos favoritos.`;
      this.notificationService.showSuccess(message);
      // A UI será atualizada reativamente pelo onSnapshot do DataService
    } catch (error) {
      console.error('Erro ao atualizar o status de favorito:', error);
      this.notificationService.showError('Erro ao atualizar o status de favorito.');
    }
  }

  onNoteSelected(noteId: string) {
    this.selectedNoteId.set(noteId);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  navigateBack() {
    if (this.currentNoteId() && this.responsiveService.isMobile()) {
      this.router.navigate(['/notebooks', this.selectedNotebookId()]);
    } else if (this.selectedNotebookId() && this.responsiveService.isMobile()) {
      this.selectedNotebookId.set(null);
      this.router.navigate(['/notebooks']);
    }
  }
}