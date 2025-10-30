import { Component, Input, OnChanges, SimpleChanges, inject, signal, WritableSignal, computed, Signal, OnInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { DataService, Note } from '../services/data.service';
import { Subscription, debounceTime, Subject, filter } from 'rxjs';
import { HighlightPipe } from '../pipes/highlight.pipe';
import { StripHtmlPipe } from '../pipes/strip-html.pipe';
import { NotebookService } from '../services/notebook.service';
import { Modal } from '../modal/modal';

import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-note-column',
  standalone: true,
  imports: [CommonModule, FormsModule, Modal, HighlightPipe, StripHtmlPipe, LucideAngularModule],
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
export class NoteColumn implements OnChanges, OnInit, OnDestroy {
  @Input() notebookId: string | null = null;
  @Input() showBackButton = false;
  @Output() noteSelected = new EventEmitter<string>();
  @Output() back = new EventEmitter<void>();

  private dataService = inject(DataService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  notebookService = inject(NotebookService); // Injetado para o template
  private notesSubscription: Subscription | null = null;
  private searchSubject = new Subject<string>();
  private routerSubscription: Subscription | null = null;

  notes: WritableSignal<Note[]> = signal([]);
  isLoading: WritableSignal<boolean> = signal(false);
  error: WritableSignal<string | null> = signal(null);
  searchTerm: WritableSignal<string> = signal('');
  activeNoteId: WritableSignal<string | null> = signal(null);
  
  isNoteModalVisible: WritableSignal<boolean> = signal(false);
  currentNote: WritableSignal<Partial<Note>> = signal({});
  isEditing: WritableSignal<boolean> = signal(false);

  filteredNotes: Signal<Note[]> = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) {
      return this.notes();
    }
    return this.notes().filter(note => note.title.toLowerCase().includes(term) || note.content.toLowerCase().includes(term));
  });

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

  ngOnChanges(changes: SimpleChanges) {
    if (changes['notebookId'] && this.notebookId) {
      this.fetchNotes();
    }
  }

  ngOnDestroy() {
    this.notesSubscription?.unsubscribe();
    this.searchSubject.unsubscribe();
    this.routerSubscription?.unsubscribe();
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
  
  selectNote(noteId: string) {
    // Em vez de apenas emitir, agora navegamos para a rota do editor
    if (this.notebookId) {
      this.router.navigate(['/notebooks', this.notebookId, 'notes', noteId]);
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
