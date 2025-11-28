import { Component, Input, inject, signal, WritableSignal, computed, Signal, OnInit, Output, EventEmitter, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { Subscription, debounceTime, Subject, filter } from 'rxjs';
import { HighlightPipe } from '../pipes/highlight.pipe';
import { NotebookService } from '../../services/notebook.service';
import { Modal } from '../modal/modal';
import { NotificationService } from '../../services/notification.service'; 
import { NoteService, Note } from '../../services/note.service';
import { ResponsiveService } from '../../services/responsive';
import { Notebook } from '../../services/data.service';
import { ContextMenuModule } from 'primeng/contextmenu';
import { MenuItem } from 'primeng/api';
import { ContextMenu } from 'primeng/contextmenu';
import { MenuModule } from 'primeng/menu';
import { Menu } from 'primeng/menu';

import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-note-column',
  standalone: true,
  imports: [CommonModule, FormsModule, Modal, HighlightPipe, LucideAngularModule, ContextMenuModule, MenuModule],
  templateUrl: './note-column.html',
  styleUrl: './note-column.css',
  animations: [
    trigger('listAnimation', [
      transition(':enter', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger(50, [
            animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class NoteColumn implements OnInit, OnDestroy {
  @Input({ required: true }) set notebookId(id: string | null) {
    this.notebookIdSignal.set(id);
    this.noteService.activeNotebookId.set(id);
    this.searchTerm.set('');
    console.log(`NoteColumn: Input notebookId set to: ${id}`);
  }
  @Input() showBackButton = false;
  @Output() noteSelected = new EventEmitter<string>();
  @Output() back = new EventEmitter<void>();
  @Output() createNoteClicked = new EventEmitter<void>();
  @Output() createNotebookClicked = new EventEmitter<void>();
  @Output() renameNotebookClicked = new EventEmitter<{id: string, name: string, color?: string}>();

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  notebookService = inject(NotebookService);
  private notificationService = inject(NotificationService);
  noteService = inject(NoteService);
  responsiveService = inject(ResponsiveService);
  private searchSubject = new Subject<string>();
  private routerSubscription: Subscription | null = null;

  notebookIdSignal: WritableSignal<string | null> = signal(null);
  searchTerm: WritableSignal<string> = signal('');
  activeNoteId: WritableSignal<string | null> = signal(null);

  currentNotebook: Signal<Notebook | undefined> = computed(() => {
    const notebookId = this.notebookIdSignal();
    if (!notebookId) return undefined;
    return this.notebookService.notebooks().find(n => n.id === notebookId);
  });

  // Signal para controlar a visualização (Ativas vs Arquivadas)
  showArchived: Signal<boolean> = this.noteService.showArchived;

  // As notas agora vêm do NoteService
  notes: Signal<Note[]> = this.noteService.notes;
  

  filteredNotes: Signal<Note[]> = computed(() => {
    const notesToSort = this.notes();
    const term = this.searchTerm().toLowerCase();

    console.log(`NoteColumn: filteredNotes computed. Notes count: ${notesToSort.length}, Search term: ${term}`);

    // Ordena as notas: fixadas primeiro, depois por data de criação
    const sortedNotes = [...notesToSort].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const dateA = a.createdAt?.toMillis() || 0;
      const dateB = b.createdAt?.toMillis() || 0;
      return dateB - dateA;
    });

    if (!term) {
      return sortedNotes;
    }
    return sortedNotes.filter(note => 
      note.title.toLowerCase().includes(term) || 
      note.content.toLowerCase().includes(term) ||
      (note.tags && note.tags.some(tag => tag.toLowerCase().includes(term)))
    );
  });

  constructor() {}

  @ViewChild('cm') cm!: ContextMenu;
  @ViewChild('noteMenu') noteMenu!: Menu;
  
  menuItems: MenuItem[] = [];
  noteMenuItems: MenuItem[] = [];

  ngOnInit() {
    this.searchSubject.pipe(debounceTime(300)).subscribe(searchTerm => {
      this.searchTerm.set(searchTerm);
    });

    // Ouve as mudanças de rota para destacar a nota ativa
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      // O NoteEditor é um filho da rota 'notebooks', então pegamos o 'firstChild'
      const activeNoteId = this.route.firstChild?.snapshot.paramMap.get('noteId');
      this.activeNoteId.set(activeNoteId || null);
    });
  }

    onContextMenu(event: MouseEvent, note?: Note) {
      event.preventDefault();
      event.stopPropagation(); // Prevent document context menu
  
      // Fecha outros menus abertos simulando um clique fora
      document.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      this.menuItems = [];

      if (note) {
        // Context menu for a specific note
        this.selectNote(note.id); // Select the note first
        this.menuItems = [
            { label: 'Editar Nota', icon: 'pi pi-pencil', command: () => this.selectNote(note.id) },
            { label: 'Deletar Nota', icon: 'pi pi-trash', command: () => this.noteService.requestDeleteNote(note) },
            { label: note.isArchived ? 'Desarquivar Nota' : 'Arquivar Nota', 
              icon: note.isArchived ? 'pi pi-folder-open' : 'pi pi-box', 
              command: () => this.noteService.updateNoteArchivedStatus(note, !note.isArchived) 
            },
            { separator: true },
            { label: 'Nova Nota', icon: 'pi pi-plus', command: () => this.openCreateNoteModal() }
        ];
      } else {
         // Context menu for the background (general actions)
          this.menuItems = [
            { label: 'Nova Nota', icon: 'pi pi-file', command: () => this.openCreateNoteModal() },
            { 
              label: 'Novo Caderno', 
              icon: 'pi pi-folder', 
              command: () => this.createNotebookClicked.emit() 
            },
            {
              label: 'Renomear Caderno',
              icon: 'pi pi-pencil',
              visible: !!this.notebookIdSignal(),
              command: () => {
                   const currentNotebook = this.currentNotebook();
                   if(currentNotebook) {
                       this.renameNotebookClicked.emit({
                         id: currentNotebook.id, 
                         name: currentNotebook.name, 
                         color: currentNotebook.color
                       });
                   }
              }
            },
            { separator: true },
            {
              label: this.showArchived() ? 'Ver Notas Ativas' : 'Ver Notas Arquivadas',
              icon: this.showArchived() ? 'pi pi-list' : 'pi pi-history',
              command: () => this.noteService.showArchived.set(!this.showArchived())
            }
          ];
      }
  
      this.cm.show(event);
    }
      
        onNoteOptionsClick(event: MouseEvent, note: Note) {
          event.stopPropagation(); // Prevent triggering the note click/selection
          
          // Fecha outros menus abertos simulando um clique fora
          document.dispatchEvent(new MouseEvent('click', { bubbles: true }));

          this.noteMenuItems = [
            { label: 'Editar Nota', icon: 'pi pi-pencil', command: () => this.selectNote(note.id) },
            { label: 'Deletar Nota', icon: 'pi pi-trash', command: () => this.noteService.requestDeleteNote(note) },
            { label: note.isArchived ? 'Desarquivar Nota' : 'Arquivar Nota', 
              icon: note.isArchived ? 'pi pi-folder-open' : 'pi pi-box', 
              command: () => this.noteService.updateNoteArchivedStatus(note, !note.isArchived) 
            }
          ];
          this.noteMenu.toggle(event);
        }
      
        ngOnDestroy() {
          this.searchSubject.unsubscribe();
          this.routerSubscription?.unsubscribe();
        }  
  selectNote(noteId: string) {
    const notebookId = this.notebookIdSignal();
    // Em vez de apenas emitir, agora navegamos para a rota do editor
    if (notebookId) {
      this.router.navigate(['/notebooks', notebookId, 'notes', noteId]);
    }
  }

  onSearch(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.searchSubject.next(inputElement.value);
  }

  openCreateNoteModal() {
    this.createNoteClicked.emit();
  }

  async togglePin(note: Note) {
    try {
      await this.noteService.updateNotePinnedStatus(note.id, !note.isPinned);
      // A UI será atualizada automaticamente pelo onSnapshot do DataService
    } catch (error) { 
      console.error('Erro ao fixar/desafixar a nota:', error);
      this.notificationService.showError('Erro ao atualizar a nota.');
    }
  }
}
