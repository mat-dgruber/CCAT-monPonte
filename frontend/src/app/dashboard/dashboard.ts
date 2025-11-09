import { Component, inject, signal, WritableSignal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth';
import { DataService, Notebook } from '../services/data.service';
import { ClipService } from '../services/clip.service';
import { NotebookService } from '../services/notebook.service';
import { User } from '@angular/fire/auth';
import { Note } from '../services/note.service';
import { Subscription, forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ClickOutsideDirective } from '../directives/click-outside.directive';
import { trigger, transition, style, animate } from '@angular/animations';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule, ClickOutsideDirective],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
  animations: [
    trigger('flyInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('150ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)' }))
      ])
    ])
  ]
})
export class DashboardComponent {
  private authService = inject(AuthService);
  private dataService = inject(DataService);
  notebookService = inject(NotebookService); // Public for template access
  clipService = inject(ClipService); // Public for template access
  private subscriptions: Subscription = new Subscription();

  currentUser: WritableSignal<User | null> = signal(null);
  allRecentNotes: WritableSignal<Note[]> = signal([]);
  isLoadingNotes = signal(true);
  isFilterMenuOpen = signal(false);
  selectedNotebook: WritableSignal<Notebook | null> = signal(null);

  filteredNotes = computed(() => {
    const notes = this.allRecentNotes();
    const selected = this.selectedNotebook();
    if (!selected) {
      return notes.slice(0, 5); // Retorna as 5 mais recentes de todos os cadernos
    }
    return notes.filter(note => note.notebookId === selected.id).slice(0, 5);
  });

  constructor() {
    const authSub = this.authService.authState$.subscribe(user => {
      this.currentUser.set(user);
      if (user) {
        this.loadRecentNotes();
      } else {
        this.allRecentNotes.set([]);
      }
    });
    this.subscriptions.add(authSub);
  }

  loadRecentNotes() {
    this.isLoadingNotes.set(true);
    const notebooks = this.notebookService.notebooks();
    if (!notebooks || notebooks.length === 0) {
      this.allRecentNotes.set([]);
      this.isLoadingNotes.set(false);
      return;
    }

    const noteObservables = notebooks.map(notebook =>
      this.dataService.getNotes(notebook.id).pipe(
        map(notes => notes.map(note => ({ ...note, notebookId: notebook.id, notebookName: notebook.name })))
      )
    );

    forkJoin(noteObservables).subscribe(notesFromNotebooks => {
      const allNotes = notesFromNotebooks.flat();
      allNotes.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      this.allRecentNotes.set(allNotes);
      this.isLoadingNotes.set(false);
    });
  }

  selectNotebook(notebook: Notebook | null) {
    this.selectedNotebook.set(notebook);
    this.closeFilterMenu();
  }

  toggleFilterMenu() {
    this.isFilterMenuOpen.set(!this.isFilterMenuOpen());
  }

  closeFilterMenu() {
    this.isFilterMenuOpen.set(false);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
