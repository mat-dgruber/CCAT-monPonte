import { Component, inject, OnInit, OnDestroy, HostListener, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DataService, Notebook } from '../../services/data.service';
import { NotificationService } from '../../services/notification.service';
import { ClipService } from '../../services/clip.service';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth';
import { Modal } from '../modal/modal';
import { ThemeService } from '../../services/theme';

@Component({
  selector: 'app-clip',
  standalone: true,
  imports: [FormsModule, CommonModule, Modal],
  templateUrl: './clip.html',
  styleUrls: ['./clip.css']
})
export class Clip implements OnInit, OnDestroy {
  
  clipService = inject(ClipService);
  themeService = inject(ThemeService);
  private dataService = inject(DataService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private notebooksSubscription: Subscription | null = null;
  private userSubscription: Subscription | null = null;

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
  }

  ngOnDestroy() {
    this.notebooksSubscription?.unsubscribe();
    this.userSubscription?.unsubscribe();
  }

  private loadNotebooks(): void {
    this.isLoadingNotebooks = true;
    this.notebooksSubscription = this.dataService.getNotebooks().subscribe(notebooks => {
      this.notebooks = notebooks;
      this.isLoadingNotebooks = false;
    });
  }

  @HostListener('window:keydown.control.s', ['$event'])
  handleKeyboardEvent(event: Event) {
    event.preventDefault();
    this.clipService.saveClip(this.clipService.copyText());
    this.notificationService.showSuccess('Clip salvo!');
  }
  
  @HostListener('window:keydown.control.d', ['$event'])
  handleClearKeyboardEvent(event: Event) {
    event.preventDefault();
    this.clearText();
    this.notificationService.showSuccess('Clip limpo!');
  }
  
  @HostListener('window:keydown.control.shift.c', ['$event'])
  handleCopyKeyboardEvent(event: Event) {
    event.preventDefault();
    this.onCopy();
  }
  
  @HostListener('window:keydown.control.m', ['$event'])
  handleOpenModalKeyboardEvent(event: Event) {
    event.preventDefault();
    this.openConvertToNoteModal();
  }
  
  @HostListener('window:keydown.escape', ['$event'])
  handleEscapeKey(event: Event) {
    if (this.isModalVisible) {
      event.preventDefault();
      this.cancelConvertToNote();
    }
  }

  onTextChange(text: string) {
    this.clipService.onTextChange(text);
  }

  clearText() {
    this.clipService.onTextChange('');
  }

  async onCopy() {
    try {
      await navigator.clipboard.writeText(this.clipService.copyText());
      this.notificationService.showSuccess('Copiado para a área de transferência!');
    } catch (error) {
      this.notificationService.showError('Falha ao copiar!');
    }
  }

  onFontChange(event: Event) {
    const selectedValue = (event.target as HTMLSelectElement).value;
    this.clipService.setSelectedFont(selectedValue);
  }

  onFontSizeChange(event: Event) {
    const selectedValue = (event.target as HTMLSelectElement).value;
    this.clipService.setSelectedFontSize(selectedValue);
  }

  openConvertToNoteModal() {
    this.isModalVisible = true;
    this.newNoteTitle = this.clipService.copyText().substring(0, 20) + '...';
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
        this.clearText();
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
