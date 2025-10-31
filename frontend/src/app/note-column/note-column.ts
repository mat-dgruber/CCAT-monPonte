import { Component, Input, inject, signal, WritableSignal, computed, Signal, OnInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { DataService, Note } from '../services/data.service';
import { Subscription, debounceTime, Subject, filter, switchMap, of } from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { HighlightPipe } from '../pipes/highlight.pipe';
import { NotebookService } from '../services/notebook.service';
import { Modal } from '../modal/modal';
import { NotificationService } from '../services/notification.service'; 

import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-note-column',
  standalone: true,
  imports: [CommonModule, FormsModule, Modal, HighlightPipe, LucideAngularModule],
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
  }
  @Input() showBackButton = false;
  @Output() noteSelected = new EventEmitter<string>();
  @Output() back = new EventEmitter<void>();

  private dataService = inject(DataService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  notebookService = inject(NotebookService); // Injetado para o template
  private notificationService = inject(NotificationService);
  private searchSubject = new Subject<string>();
  private routerSubscription: Subscription | null = null;

  notebookIdSignal: WritableSignal<string | null> = signal(null);
  searchTerm: WritableSignal<string> = signal('');
  activeNoteId: WritableSignal<string | null> = signal(null);
  
  isNoteModalVisible: WritableSignal<boolean> = signal(false);
  currentNote: WritableSignal<Partial<Note>> = signal({});
  isEditing: WritableSignal<boolean> = signal(false);

  // Lógica simplificada: obtém as notas diretamente do cache do NotebookService
  private notes$ = toObservable(this.notebookIdSignal).pipe(
    switchMap(id => id ? this.dataService.getNotes(id) : of([]))
  );
  notes: Signal<Note[]> = toSignal(this.notes$, { initialValue: [] });
  

  filteredNotes: Signal<Note[]> = computed(() => {
    const notesToSort = this.notes();
    const term = this.searchTerm().toLowerCase();

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
    this.isEditing.set(false);
    this.currentNote.set({ title: '', content: '' });
    this.isNoteModalVisible.set(true);
  }

  closeNoteModal() {
    this.isNoteModalVisible.set(false);
    this.currentNote.set({});
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

  async saveNote(noteData: Partial<Note>) {
    if (!this.notebookId) return;

    try {
      if (this.isEditing() && noteData.id) {
        await this.dataService.updateNote(this.notebookId, noteData.id, { title: noteData.title!, content: noteData.content! });
      } else {
        await this.dataService.createNote(this.notebookId, noteData.title!, noteData.content!);
      }
      this.closeNoteModal();
    } catch (error) {
      console.error('Erro ao salvar nota:', error);
    }
  }
}
