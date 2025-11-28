import { Component, inject, OnInit, OnDestroy, signal, WritableSignal, computed, Signal, ChangeDetectorRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate, keyframes } from '@angular/animations';
import { AuthService } from '../../services/auth';
import { Router, ActivatedRoute, NavigationEnd, RouterOutlet, ActivatedRouteSnapshot } from '@angular/router';
import { NoteColumn } from '../note-column/note-column';
import { DataService, Notebook, SortBy, SortDirection } from '../../services/data.service';
import { NoteService, Note } from '../../services/note.service';
import { NotebookService } from '../../services/notebook.service';
import { NotificationService } from '../../services/notification.service'; 
import { HighlightPipe } from '../pipes/highlight.pipe';
import { Modal } from '../modal/modal';
import { LucideAngularModule } from 'lucide-angular';
import { Subscription, Subject } from 'rxjs';
import { filter, debounceTime } from 'rxjs/operators';
import { ResponsiveService } from '../../services/responsive';
import { ContextMenuModule } from 'primeng/contextmenu';
import { MenuItem } from 'primeng/api';

const SORT_PREFERENCE_KEY = 'notebooksSortPreference';

@Component({
  selector: 'app-cadernos',
  standalone: true,
  imports: [NoteColumn, HighlightPipe, FormsModule, Modal, LucideAngularModule, RouterOutlet, ContextMenuModule],
  templateUrl: './notebooks.html',
  animations: [
    trigger('itemAnimation', [
      transition(':enter', [
        animate('400ms ease-out', keyframes([
          style({ opacity: 0, transform: 'scale(0.9) translateY(-20px)', offset: 0 }),
          style({ opacity: 1, transform: 'scale(1.05) translateY(5px)', offset: 0.7 }),
          style({ opacity: 1, transform: 'scale(1) translateY(0)', offset: 1.0 })
        ]))
      ]),
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
    ])
  ]
})
export class Notebooks implements OnInit, OnDestroy {

  private authService = inject(AuthService);
  private dataService = inject(DataService);
  notebookService = inject(NotebookService);
  noteService = inject(NoteService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  responsiveService = inject(ResponsiveService);
  private subscriptions = new Subscription();
  private searchSubject = new Subject<string>();

  // Context Menu
  items: MenuItem[] = [];

  // --- Signals de Estado ---
  selectedNotebookId: WritableSignal<string | null> = signal(null);
  currentNoteId: WritableSignal<string | null> = signal(null);
  selectedNoteId: WritableSignal<string | null> = signal(null);
  
  // Signals de Modais e Ações
  deletingNotebookIds: WritableSignal<Set<string>> = signal(new Set());
  showDeleteModal: WritableSignal<boolean> = signal(false);
  notebookToDelete: WritableSignal<{ id: string; name: string } | null> = signal(null);
  showCreateRenameModal: WritableSignal<boolean> = signal(false);
  notebookToRename: WritableSignal<{ id: string; name: string } | null> = signal(null);
  modalMode: WritableSignal<'create' | 'rename'> = signal('create');
  newNotebookName: WritableSignal<string> = signal('');
  newNotebookColor: WritableSignal<string> = signal('#FFFFFF');

  // Signals Note Modal
  isNoteModalVisible: WritableSignal<boolean> = signal(false);
  currentNote: WritableSignal<Partial<Note>> = signal({});
  isEditing: WritableSignal<boolean> = signal(false);
  modalTags: WritableSignal<string> = signal('');
  modalIsPinned: WritableSignal<boolean> = signal(false);

  // Signals Delete Note Modal
  showDeleteNoteModal: WritableSignal<boolean> = signal(false);
  noteToDelete: WritableSignal<Note | null> = signal(null);
  
  sortOption: WritableSignal<{ by: SortBy, direction: SortDirection }> = signal({ by: 'createdAt', direction: 'desc' });
  searchTerm: WritableSignal<string> = signal('');
  
  // Animations state
  routeAnimationState: WritableSignal<string> = signal('');

  availableColors: string[] = [
    '#FFFFFF', '#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF'
  ];

  // --- Computed Signals ---
  filteredNotebooks: Signal<Notebook[]> = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const notebooks = this.notebookService.notebooks();
    const sort = this.sortOption();

    const filtered = term
      ? notebooks.filter(notebook => notebook.name.toLowerCase().includes(term))
      : [...notebooks];

    return filtered.sort((a, b) => {
      const valA = sort.by === 'name' ? a.name.toLowerCase() : a.createdAt?.toMillis() || 0;
      const valB = sort.by === 'name' ? b.name.toLowerCase() : b.createdAt?.toMillis() || 0;

      if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  });

  favoriteNotebooks: Signal<Notebook[]> = computed(() => 
    this.filteredNotebooks().filter(n => n.isFavorite)
  );

  regularNotebooks: Signal<Notebook[]> = computed(() =>
    this.filteredNotebooks().filter(n => !n.isFavorite)
  );

  constructor(private cdr: ChangeDetectorRef) {}

  @ViewChild('cm') cm!: any;

  ngOnInit() {
    // 1. Atualiza o estado baseado na rota ATUAL imediatamente (corrige o problema do Dashboard)
    this.updateStateFromRoute();

    // 2. Escuta mudanças de navegação futuras
    const routeSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateStateFromRoute();
    });
    this.subscriptions.add(routeSub);

    // Subscription para requisições de deleção vindas do Editor
    const deleteRequestSub = this.noteService.deleteNoteRequest$.subscribe(note => {
      this.openDeleteNoteModal(note);
    });
    this.subscriptions.add(deleteRequestSub);

    // Carregar preferências de ordenação
    const savedSort = localStorage.getItem(SORT_PREFERENCE_KEY);
    if (savedSort) {
      try {
        const parsedSort = JSON.parse(savedSort);
        if (parsedSort.by && parsedSort.direction) {
          this.sortOption.set(parsedSort);
        }
      } catch (e) {
        console.error('Erro ao carregar preferência de ordenação', e);
      }
    }

    // Busca com debounce
    const searchSub = this.searchSubject.pipe(
      debounceTime(300)
    ).subscribe(term => {
      this.searchTerm.set(term);
    });
    this.subscriptions.add(searchSub);
  }

  onContextMenu(event: MouseEvent, notebook?: Notebook) {
    event.preventDefault();
    event.stopPropagation();

    // Fecha outros menus abertos simulando um clique fora
    document.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    this.items = [];

    if (notebook) {
      this.items = [
        {
          label: 'Renomear Caderno',
          icon: 'pi pi-pencil',
          command: () => this.openRenameModal(notebook.id, notebook.name, notebook.color)
        },
        {
          label: 'Deletar Caderno',
          icon: 'pi pi-trash',
          command: () => this.openDeleteModal(notebook.id, notebook.name)
        },
        { separator: true },
        { 
          label: 'Novo Caderno', 
          icon: 'pi pi-plus', 
          command: () => this.openCreateModal() 
        }
      ];
    } else {
      // Background
      this.items = [
        { 
          label: 'Novo Caderno', 
          icon: 'pi pi-plus', 
          command: () => this.openCreateModal() 
        }
      ];
    }

    this.cm.show(event);
  }

  /**
   * Função Central para Sincronizar URL -> Estado do Componente
   * Procura recursivamente por notebookId e noteId na árvore de rotas ativa.
   */
  private updateStateFromRoute() {
    const snapshot = this.route.snapshot;
    const notebookId = this.findParamInTree(snapshot, 'notebookId');
    const noteId = this.findParamInTree(snapshot, 'noteId');

    // Atualiza os signals
    this.currentNoteId.set(noteId);
    
    if (notebookId) {
      this.selectedNotebookId.set(notebookId);
    } else {
      // Se não tem notebookId na URL, não temos nenhum selecionado
      this.selectedNotebookId.set(null);
    }

    // Atualiza estado da animação
    this.routeAnimationState.set(this.router.url);
  }

  /**
   * Helper recursivo para encontrar um parâmetro em qualquer nível da rota ativa
   */
  private findParamInTree(snapshot: ActivatedRouteSnapshot, paramName: string): string | null {
    if (snapshot.paramMap.has(paramName)) {
      return snapshot.paramMap.get(paramName);
    }
    if (snapshot.firstChild) {
      return this.findParamInTree(snapshot.firstChild, paramName);
    }
    return null;
  }

  // --- Métodos Existentes (mantidos iguais) ---

  retryFetchNotebooks() { console.log('Tentando buscar cadernos novamente...'); }

  changeSortOrder(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const [by, direction] = selectElement.value.split('-') as [SortBy, SortDirection];
    const newSortOption = { by, direction };
    this.sortOption.set(newSortOption);
    localStorage.setItem(SORT_PREFERENCE_KEY, JSON.stringify(newSortOption));
  }

  onSearch(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.searchSubject.next(inputElement.value);
  }

  clearSearch(inputElement: HTMLInputElement) {
    this.searchTerm.set('');
    inputElement.focus();
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
      await this.dataService.createNotebook(name, color);
      this.notificationService.showSuccess(`Caderno "${name}" criado com sucesso.`);
    } catch (error) {
      console.error('Erro ao criar o caderno:', error);
      this.notificationService.showError(`Erro ao criar o caderno "${name}".`);
    }
  }

  async updateNotebook(id: string, newName: string) {
    try {
      await this.dataService.updateNotebook(id, newName);
      this.notificationService.showSuccess(`Caderno renomeado para "${newName}".`);
    } catch (error) {
      this.notificationService.showError(`Erro ao renomear o caderno.`);
    }
  }

  async updateNotebookColor(id: string, color: string) {
    try {
      await this.dataService.updateNotebookColor(id, color);
      this.notificationService.showSuccess(`Cor do caderno atualizada.`);
    } catch (error) {
      this.notificationService.showError(`Erro ao atualizar a cor do caderno.`);
    }
  }

  async deleteNotebook(id: string) {
    try { await this.dataService.deleteNotebook(id); } 
    catch (error) { console.error('Erro ao deletar o caderno:', error); }
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
    // Se estamos no mobile e selecionamos um caderno, vamos para a visualização dele
    if (this.responsiveService.isMobile()) {
        // A navegação via Router seria ideal aqui se tiveres uma rota para /notebooks/:id
        // Mas como a tua UI controla via routerLink na lista, aqui apenas atualizamos o estado.
    }
  }

  async toggleFavorite(notebook: Notebook) {
    try {
      await this.dataService.updateNotebookFavoriteStatus(notebook.id, !notebook.isFavorite);
      this.notificationService.showSuccess(notebook.isFavorite ? 'Removido dos favoritos.' : 'Adicionado aos favoritos.');
    } catch (error) {
      this.notificationService.showError('Erro ao atualizar favorito.');
    }
  }

  onNoteSelected(noteId: string) {
    this.selectedNoteId.set(noteId);
  }

  // Note Modal Methods
  openCreateNoteModal() {
    this.isEditing.set(false);
    this.currentNote.set({ title: '', content: '' });
    this.modalTags.set('');
    this.modalIsPinned.set(false);
    this.isNoteModalVisible.set(true);
  }

  closeNoteModal() {
    this.isNoteModalVisible.set(false);
    this.currentNote.set({});
  }

  async saveNote(noteData: Partial<Note>) {
    try {
      const tagsArray = this.modalTags().split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      const isPinned = this.modalIsPinned();

      if (this.isEditing() && noteData.id) {
        await this.noteService.updateNote(noteData.id, { title: noteData.title!, content: noteData.content!, tags: tagsArray, isPinned: isPinned });
        this.notificationService.showSuccess('Nota atualizada com sucesso.');
      } else {
        await this.noteService.createNote(noteData.title!, noteData.content!, tagsArray, isPinned);
        this.notificationService.showSuccess('Nota criada com sucesso.');
      }
      this.closeNoteModal();
    } catch (error) {
      this.notificationService.showError('Erro ao salvar a nota.');
    }
  }

  openDeleteNoteModal(note: Note) {
    this.noteToDelete.set(note);
    this.showDeleteNoteModal.set(true);
  }

  closeDeleteNoteModal() {
    this.showDeleteNoteModal.set(false);
    this.noteToDelete.set(null);
  }

  async confirmDeleteNote() {
    const note = this.noteToDelete();
    if (!note || !note.id) return;
    try {
      await this.noteService.deleteNote(note.id);
      this.notificationService.showSuccess(`Nota deletada.`);
      if (this.currentNoteId() === note.id) {
        this.router.navigate(['/notebooks', this.selectedNotebookId()]);
      }
    } catch (error) {
      this.notificationService.showError('Erro ao deletar a nota.');
    } finally {
      this.closeDeleteNoteModal();
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  // Navegação Mobile (Botão Voltar)
  navigateBack() {
    if (this.currentNoteId() && this.responsiveService.isMobile()) {
      // Se estiver numa nota, volta para a lista de notas do caderno
      this.router.navigate(['/notebooks', this.selectedNotebookId()]);
    } else if (this.selectedNotebookId() && this.responsiveService.isMobile()) {
      // Se estiver na lista de notas, volta para a lista de cadernos
      this.selectedNotebookId.set(null);
      this.router.navigate(['/notebooks']);
    }
  }
}