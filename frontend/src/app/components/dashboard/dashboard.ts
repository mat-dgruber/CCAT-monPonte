import { Component, inject, signal, WritableSignal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  imports: [CommonModule, RouterLink, LucideAngularModule, ClickOutsideDirective, HtmlToTextPipe, ListboxModule, FormsModule],
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
  private noteService = inject(NoteService);
  private subscriptions: Subscription = new Subscription();
  private htmlToTextPipe = inject(HtmlToTextPipe);
  tutorialService = inject(TutorialService);

  currentUser: WritableSignal<User | null> = signal(null);
  allRecentNotes: WritableSignal<Note[]> = signal([]);
  isLoadingNotes = signal(true);
  isFilterMenuOpen = signal(false);
  selectedNotebook: WritableSignal<Notebook | null> = signal(null);

  notebookOptions = computed(() => {
    const allOption = { label: 'Todos os Cadernos', value: null };
    const notebooks = this.notebookService.notebooks().map(n => ({ label: n.name, value: n }));
    return [allOption, ...notebooks];
  });

  filteredNotes = computed(() => {
    const notes = this.allRecentNotes();
    const selected = this.selectedNotebook();
    if (!selected) {
      return notes.slice(0, 6);
    }
    return notes.filter(note => note.notebookId === selected.id).slice(0, 6);
  });

  welcomeMessage = computed(() => {
    const user = this.currentUser();
    if (!user) return 'Seja bem-vindo(a)!';

    // Se estivermos mostrando o tutorial (ou o usuário ainda não completou), mostramos "Seja bem-vindo(a)!"
    // Como o status do tutorial é carregado assincronamente, podemos usar o signal 'showTutorial' se quisermos reatividade exata,
    // mas o DataService retorna o status.
    // Vamos simplificar: se é a primeira vez (tutorial não completo), mostra "Seja bem-vindo(a)!".
    // Caso contrário, "Seja bem-vindo(a) de volta!".
    // O ideal seria ter acesso ao signal do tutorialCompleted aqui, mas vamos usar a lógica existente de tempo como fallback
    // ou integrá-la.

    // Check local signal first (populated by data service check)
    if (this.isFirstAccessUser()) {
       return 'Seja bem-vindo(a)!';
    }

    const metadata = user.metadata;
    if (metadata.creationTime && metadata.lastSignInTime) {
      const creationTime = new Date(metadata.creationTime).getTime();
      const lastSignInTime = new Date(metadata.lastSignInTime).getTime();

      if (Math.abs(lastSignInTime - creationTime) < 120000) {
        return 'Seja bem-vindo(a)!';
      }
    }

    return 'Seja bem-vindo(a) de volta!';
  });

  isFirstAccessUser = signal(false); // Signal to track if tutorial incomplete

  constructor() {
    // Inject TutorialService here (need to add import manually or let IDE handle it, but I must do it via replace)
    // Actually, I can inject it using 'inject' in property declaration.

    const authSub = this.authService.authState$.subscribe(user => {
      this.currentUser.set(user);
      if (!user) {
        this.allRecentNotes.set([]);
      } else {
        // Check tutorial status
        this.dataService.getTutorialStatus().pipe(take(1)).subscribe(completed => {
            if (!completed) {
                this.isFirstAccessUser.set(true);
                // Trigger tutorial
                this.tutorialService.start();
            } else {
                this.isFirstAccessUser.set(false);
            }
        });
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
    this.isFilterMenuOpen.update(v => !v);
  }

  closeFilterMenu() {
    this.isFilterMenuOpen.set(false);
  }

  isFirstAccess(user: User): boolean {
    if (!user.metadata.creationTime || !user.metadata.lastSignInTime) return false;
    const creation = new Date(user.metadata.creationTime).getTime();
    const lastSignIn = new Date(user.metadata.lastSignInTime).getTime();
    // Assuming if creation and last sign in are close (e.g. within a few seconds), it is first access.
    // However, after first login, lastSignInTime updates. So this logic only works ONCE during the first session.
    // If the user refreshes, lastSignInTime might stay same until next sign in.
    // Actually, Firebase updates lastSignInTime on each signIn.
    // Let's assume if they are equal (as strings usually) it is first access.
    return user.metadata.creationTime === user.metadata.lastSignInTime;
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
