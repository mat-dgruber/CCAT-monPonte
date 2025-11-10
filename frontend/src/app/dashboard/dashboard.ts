import { Component, inject, signal, WritableSignal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth';
import { DataService, Notebook } from '../services/data.service';
import { ClipService } from '../services/clip.service';
import { NotebookService } from '../services/notebook.service';
import { User } from '@angular/fire/auth';
import { Note } from '../services/note.service';
import { Subscription, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Copy, Ellipsis } from 'lucide-angular';
import { ClickOutsideDirective } from '../directives/click-outside.directive';
import { trigger, transition, style, animate } from '@angular/animations';
import { NotificationService } from '../services/notification.service';
import { HtmlToTextPipe } from '../pipes/html-to-text.pipe';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule, ClickOutsideDirective, HtmlToTextPipe],
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
  private notificationService = inject(NotificationService);
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
      if (!user) {
        this.allRecentNotes.set([]);
      }
    });
    this.subscriptions.add(authSub);

    effect(() => {
      const notebooks = this.notebookService.notebooks();
      const user = this.currentUser();
      const isLoadingNotebooks = this.notebookService.isLoading();

      if (isLoadingNotebooks) {
        this.isLoadingNotes.set(true);
        return; 
      }

      if (user && notebooks.length > 0) {
        this.isLoadingNotes.set(true); 
        const noteObservables = notebooks.map(notebook =>
          this.dataService.getNotes(notebook.id, false).pipe( // Alterado de true para false
            map(notes => notes.map(note => ({ ...note, notebookId: notebook.id, notebookName: notebook.name })))
          )
        );

        forkJoin(noteObservables).pipe(
          map(notesFromNotebooks => {
            const allNotes = notesFromNotebooks.flat();
            allNotes.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            return allNotes;
          }),
          catchError(error => {
            console.error('Error fetching recent notes.', error); // Mensagem de erro genérica
            this.isLoadingNotes.set(false);
            return of([]); // Return an empty array on error
          })
        ).subscribe(notes => {
          this.allRecentNotes.set(notes);
          this.isLoadingNotes.set(false);
        });
      } else if (user) {
        
        this.allRecentNotes.set([]);
        this.isLoadingNotes.set(false);
      } else {
        
        this.allRecentNotes.set([]);
        this.isLoadingNotes.set(false);
      }
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

  getInitials(displayName: string | null | undefined): string {
    if (!displayName) {
      return '?';
    }
    const names = displayName.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    } else {
      return displayName.substring(0, 2).toUpperCase();
    }
  }

  copyClipContent() {
    const textToCopy = this.clipService.copyText();
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy)
        .then(() => {
          this.notificationService.showSuccess('Conteúdo copiado para a área de transferência!');
        })
        .catch(err => {
          console.error('Erro ao copiar conteúdo: ', err);
          this.notificationService.showError('Erro ao copiar conteúdo.');
        });
    } else {
      this.notificationService.showInfo('O clip está vazio.');
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
