import { Component, inject, signal, WritableSignal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';
import { DataService, Notebook } from '../../services/data.service';
import { ClipService } from '../../services/clip.service';
import { NotebookService } from '../../services/notebook.service';
import { User } from '@angular/fire/auth';
import { Note } from '../../services/note.service';
import { Subscription, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ClickOutsideDirective } from '../directives/click-outside.directive';
import { trigger, transition, style, animate } from '@angular/animations';
import { NotificationService } from '../../services/notification.service';
import { HtmlToTextPipe } from '../pipes/html-to-text.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule, ClickOutsideDirective, HtmlToTextPipe],
  providers: [HtmlToTextPipe],
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
  private router = inject(Router);
  notebookService = inject(NotebookService); // Public for template access
  clipService = inject(ClipService); // Public for template access
  private notificationService = inject(NotificationService);
  private subscriptions: Subscription = new Subscription();
  private htmlToTextPipe = inject(HtmlToTextPipe);

  currentUser: WritableSignal<User | null> = signal(null);
  allRecentNotes: WritableSignal<Note[]> = signal([]);
  isLoadingNotes = signal(true);
  isFilterMenuOpen = signal(false);
  selectedNotebook: WritableSignal<Notebook | null> = signal(null);

  filteredNotes = computed(() => {
    const notes = this.allRecentNotes();
    const selected = this.selectedNotebook();
    if (!selected) {
      return notes.slice(0, 6); // Retorna as 6 mais recentes de todos os cadernos
    }
    return notes.filter(note => note.notebookId === selected.id).slice(0, 6);
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
      const user = this.currentUser();
      if (user) {
        this.loadRecentNotes();
      } else {
        this.allRecentNotes.set([]);
      }
    });
  }

  loadRecentNotes() {
    this.isLoadingNotes.set(true);
    const notesSub = this.dataService.getAllRecentNotes(12).pipe( // Pega as 12 notas mais recentes
      catchError(error => {
        console.error('Erro ao buscar notas recentes:', error);
        this.notificationService.showError('Não foi possível carregar as notas recentes.');
        return of([]);
      }),
      finalize(() => this.isLoadingNotes.set(false))
    ).subscribe(notes => {
      this.allRecentNotes.set(notes);
    });
    this.subscriptions.add(notesSub);
  }

  selectNotebook(notebook: Notebook | null) {
    this.closeFilterMenu();
    if (notebook) {
      // Navega para a página principal de cadernos com o ID selecionado
      this.router.navigate(['/notebooks', notebook.id]);
    } else {
      // Se 'Todos' for selecionado, apenas atualiza o filtro local
      this.selectedNotebook.set(null);
    }
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
