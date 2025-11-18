import { Component, signal, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { HeaderComponent } from './header/header';
import { FooterComponent } from './footer/footer';
import { ToastNotificationComponent } from '../toast-notification/toast-notification';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Modal } from '../modal/modal';
import { DataService, Notebook } from '../../services/data.service';
import { NotificationService } from '../../services/notification.service';
import { ClipService } from '../../services/clip.service';
import { AuthService } from '../../services/auth';
import { ThemeService } from '../../services/theme';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, ToastNotificationComponent, FormsModule, CommonModule, Modal],
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class LayoutComponent implements OnInit, OnDestroy {
  isSidebarCollapsed = signal(false);
  private router = inject(Router);
  private routerSub: Subscription | null = null;

  // Modal related properties and services
  clipService = inject(ClipService);
  themeService = inject(ThemeService);
  private dataService = inject(DataService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private modalService = inject(ModalService);

  private notebooksSubscription: Subscription | null = null;
  private userSubscription: Subscription | null = null;
  private modalServiceSubscription: Subscription | null = null;

  userId: string | null = null;

  isModalVisible = false;
  newNoteTitle = '';
  notebooks: Notebook[] = [];
  selectedNotebookIdForNote: string | null = null;
  isCreatingNewNotebook = false;
  newNotebookName = '';
  isCreatingNote = false;
  deleteClipAfterConversion = false;
  isLoadingNotebooks = false;

  availableFonts = [
    { name: 'Padrão', family: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif" },
    { name: 'Manuscrito', family: "'Caveat', cursive" },
    { name: 'Serifado', family: "'Georgia', serif" }
  ];

  availableFontSizes = [
    { name: 'Pequeno', size: '14px' },
    { name: 'Médio', size: '16px' },
    { name: 'Grande', size: '20px' },
    { name: 'Extra Grande', size: '24px' }
  ];

  ngOnInit() {
    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(event => {
      if ((event as NavigationEnd).url.includes('/notes/')) {
        this.isSidebarCollapsed.set(true);
      }
    });

    // Modal related initializations
    this.userSubscription = this.authService.authState$.subscribe(user => {
      if (user) {
        this.userId = user.uid;
        this.loadNotebooks();
      } else {
        this.userId = null;
        this.notebooksSubscription?.unsubscribe();
        this.notebooks = [];
      }
    });

    this.modalServiceSubscription = this.modalService.openNoteModalRequest.subscribe(clipContent => {
      this.handleOpenNoteModal(clipContent);
    });
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
    this.notebooksSubscription?.unsubscribe();
    this.userSubscription?.unsubscribe();
    this.modalServiceSubscription?.unsubscribe();
  }

  toggleSidebar() {
    this.isSidebarCollapsed.set(!this.isSidebarCollapsed());
  }

  @HostListener('window:keydown.escape', ['$event'])
  handleEscapeKey(event: Event) {
    if (this.isModalVisible) {
      event.preventDefault();
      this.cancelConvertToNote();
    }
  }

  // Modal related methods
  private loadNotebooks(): void {
    this.isLoadingNotebooks = true;
    this.notebooksSubscription = this.dataService.getNotebooks().subscribe(notebooks => {
      this.notebooks = notebooks;
      this.isLoadingNotebooks = false;
    });
  }

  handleOpenNoteModal(clipContent: string) {
    this.isModalVisible = true;
    this.newNoteTitle = clipContent.substring(0, 20) + '...';
  }

  cancelConvertToNote() {
    this.isModalVisible = false;
    this.resetModalState();
  }

  async confirmConvertToNote() {
    if (!this.userId || !this.selectedNotebookIdForNote) {
      this.notificationService.showError('Por favor, selecione um caderno para salvar a nota.');
      return;
    }

    const title = this.newNoteTitle.trim() || this.clipService.copyText().substring(0, 20) + '...';
    this.isCreatingNote = true;

    try {
      await this.dataService.createNote(
        this.selectedNotebookIdForNote!,
        title,
        this.clipService.copyText(),
        [], // tags
        false // isPinned
      );
      this.notificationService.showSuccess('Nota criada com sucesso!');

      if (this.deleteClipAfterConversion) {
        this.clipService.onTextChange(''); // Clear the clip text
      }

      setTimeout(() => {
        this.isModalVisible = false;
        this.resetModalState();
      }, 1500);

    } catch (error) {
      this.notificationService.showError('Ocorreu um erro ao salvar a nota. Tente novamente.');
    } finally {
      this.isCreatingNote = false;
    }
  }

  async createNewNotebookFromModal() {
    if (!this.userId || !this.newNotebookName.trim()) return;

    try {
      const newNotebookId = await this.dataService.createNotebook(this.newNotebookName.trim());
      this.selectedNotebookIdForNote = newNotebookId;
      this.isCreatingNewNotebook = false;
      this.newNotebookName = '';
    } catch (error) {
      console.error('Erro ao criar novo caderno a partir do modal:', error);
    }
  }

  private resetModalState() {
    this.newNoteTitle = '';
    this.selectedNotebookIdForNote = null;
    this.isCreatingNewNotebook = false;
    this.newNotebookName = '';
    this.isCreatingNote = false;
    this.deleteClipAfterConversion = false;
  }
}
