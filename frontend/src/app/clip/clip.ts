import { Component, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Firestore, doc, DocumentReference, onSnapshot, Unsubscribe, setDoc, serverTimestamp, Timestamp } from '@angular/fire/firestore';
import { AuthService } from '../services/auth';
import { DataService, Notebook } from '../services/data.service';
import { Subscription, Subject, debounceTime } from 'rxjs';


@Component({
  selector: 'app-clip',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './clip.html',
  styleUrl: './clip.css'
})
export class Clip implements OnInit, OnDestroy {

  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private dataService = inject(DataService);
  private userSubscription: Subscription | null = null;
  private snapshotSubscription: Unsubscribe | null = null;
  private textChangeSubject = new Subject<string>();
  private textChangeSubscription: Subscription | null = null;
  private notebooksSubscription: Subscription | null = null;
  private docRef: DocumentReference | null = null;

  copyText: string = '';
  userId: string | null = null;

  // Variáveis para a funcionalidade "Converter em Nota"
  isModalVisible = false;
  newNoteTitle = '';
  notebooks: Notebook[] = [];
  selectedNotebookIdForNote: string | null = null;
  isCreatingNewNotebook = false;
  newNotebookName = '';
  copyFeedbackMessage: string | null = null;
  modalErrorMessage: string | null = null;
  noteCreationFeedbackMessage: string | null = null;
  isCreatingNote = false; // Para controlar o spinner
  deleteClipAfterConversion = false;
  isLoadingNotebooks = false;

  ngOnInit() {
    this.userSubscription = this.authService.authState$.subscribe(user => {
      if (user) {
        this.userId = user.uid;
        this.docRef = doc(this.firestore, `clip/${this.userId}`);
        this.snapshotSubscription = onSnapshot(this.docRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const text = data['text'] ?? '';
            const expiresAt = data['expiresAt'] as Timestamp | undefined;

            // 1. Verifica se o campo 'expiresAt' existe e se a data já passou.
            if (expiresAt && new Date() > expiresAt.toDate()) {
              console.log('Clip expirado. Limpando o texto.');
              this.copyText = '';
            } else {
              // 2. Se não expirou, exibe o texto normalmente.
              this.copyText = text;
              console.log('Document data updated:', this.copyText);
            }
          } else {
            // O documento ainda não existe para este usuário.
            console.log('No document found for this user.');
            this.copyText = '';
          }
        });

        // Busca a lista de cadernos do usuário para o modal
        this.isLoadingNotebooks = true;
        this.notebooksSubscription = this.dataService.getNotebooks().subscribe(notebooks => {
          this.notebooks = notebooks;
          console.log('Cadernos carregados para o modal:', this.notebooks);
          this.isLoadingNotebooks = false;
        });
      } else {
        this.userId = null;
        this.docRef = null;
        if (this.snapshotSubscription) {
          this.snapshotSubscription(); // Para de ouvir as mudanças do usuário anterior
          this.snapshotSubscription = null;
        }
        this.notebooksSubscription?.unsubscribe();
        this.isLoadingNotebooks = false;
        console.log('User logged out.');
      }
    });

    this.textChangeSubscription = this.textChangeSubject
      .pipe(debounceTime(500)) // Espera 500ms após a última alteração
      .subscribe(async (text) => {
        await this.saveClip(text);
      });
  }

  ngOnDestroy() {
    this.userSubscription?.unsubscribe();
    this.snapshotSubscription?.();
    this.textChangeSubscription?.unsubscribe();
    this.notebooksSubscription?.unsubscribe();
  }

  @HostListener('window:keydown.control.s', ['$event'])
  handleKeyboardEvent(event: Event) {
    event.preventDefault(); // Impede a ação padrão do navegador (Salvar Página)
    this.saveClip(this.copyText);
    console.log('Clip saved via Ctrl+S');
    // Fornece um feedback visual rápido
    this.copyFeedbackMessage = 'Salvo!';
    setTimeout(() => {
      this.copyFeedbackMessage = null;
    }, 1500);
  }

  @HostListener('window:keydown.control.d', ['$event'])
  handleClearKeyboardEvent(event: Event) {
    event.preventDefault(); // Impede a ação padrão do navegador (ex: Adicionar aos Favoritos)
    this.clearText();
    console.log('Clip cleared via Ctrl+D');
    // Fornece um feedback visual rápido
    this.copyFeedbackMessage = 'Limpo!';
    setTimeout(() => {
      this.copyFeedbackMessage = null;
    }, 1500);
  }

  @HostListener('window:keydown.control.shift.c', ['$event'])
  handleCopyKeyboardEvent(event: Event) {
    event.preventDefault(); // Impede qualquer ação padrão do navegador
    this.onCopy(); // Chama a nossa função de copiar tudo
    console.log('Clip content copied via Ctrl+Shift+C');
  }

  @HostListener('window:keydown.control.m', ['$event'])
  handleOpenModalKeyboardEvent(event: Event) {
    event.preventDefault(); // Impede a ação padrão do navegador
    this.openConvertToNoteModal();
    console.log('Modal "Converter em Nota" aberto via Ctrl+M');
  }

  @HostListener('window:keydown.escape', ['$event'])
  handleEscapeKey(event: Event) {
    if (this.isModalVisible) {
      event.preventDefault(); // Impede a ação padrão do navegador (se houver)
      this.cancelConvertToNote();
    }
  }

  async saveClip(text: string) {
    if (!this.docRef) return;

    try {
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + 24);
      const expiresAt = Timestamp.fromDate(expirationDate);

      await setDoc(this.docRef, { text: text, expiresAt: expiresAt });
      console.log('Document saved with expiration date.');
    } catch (error) {
      console.error('Error saving document:', error);
    }
  }

  async onCopy() {
    try {
      await navigator.clipboard.writeText(this.copyText);
      this.copyFeedbackMessage = 'Copiado!';
      console.log('Text copied to clipboard');
    } catch (error) {
      this.copyFeedbackMessage = 'Falha ao copiar!';
      console.error('Failed to copy text: ', error);
    } finally {
      // Limpa a mensagem após 2 segundos
      setTimeout(() => {
        this.copyFeedbackMessage = null;
      }, 2000);
    }
  }

  onTextChange(text: string) {
    this.textChangeSubject.next(text);
  }

  clearText() {
    this.copyText = '';
    this.onTextChange(''); // Notifica o subject para salvar o estado vazio
  }

  // Abre o modal para converter o Clip em Nota
  openConvertToNoteModal() {
    this.isModalVisible = true;
    // Opcional: Você pode querer pré-preencher newNoteTitle aqui com um trecho do copyText
    this.newNoteTitle = this.copyText.substring(0, 20) + '...'; // Exemplo
  }

  // Cancela a conversão e fecha o modal
  cancelConvertToNote() {
    this.isModalVisible = false;
    this.resetModalState();
  }

  async confirmConvertToNote() {
    // 1. Garante que o usuário está logado e um caderno foi selecionado.
    if (!this.userId || !this.selectedNotebookIdForNote) {
      console.error('Usuário ou caderno não selecionado. Não é possível criar a nota.');
      this.modalErrorMessage = 'Por favor, selecione um caderno para salvar a nota.';
      return;
    }

    // 2. Define o título, usando um fallback se estiver vazio.
    const title = this.newNoteTitle.trim() || this.copyText.substring(0, 20) + '...';

    this.isCreatingNote = true;
    this.modalErrorMessage = null;

    try {
      // 3. Chama o serviço para criar a nota com os dados coletados.
      await this.dataService.createNote(
        this.selectedNotebookIdForNote,
        title,
        this.copyText // O conteúdo da nota é o texto do Clip.
      );
      console.log('Nota criada com sucesso a partir do Clip!');
      this.noteCreationFeedbackMessage = 'Nota criada com sucesso!'; // Define a mensagem de sucesso

      if (this.deleteClipAfterConversion) {
        this.clearText();
        console.log('Clip limpo após conversão.');
      }

      // Fecha o modal após um pequeno atraso para mostrar a mensagem de sucesso
      setTimeout(() => {
        this.isModalVisible = false;
        this.resetModalState();
      }, 1500);

    } catch (error) {
      console.error('Falha ao converter Clip em Nota:', error);
      this.modalErrorMessage = 'Ocorreu um erro ao salvar a nota. Tente novamente.';
    } finally {
      this.isCreatingNote = false;
    }
  }

  async createNewNotebookFromModal() {
    if (!this.userId || !this.newNotebookName.trim()) {
      console.error('Usuário não logado ou nome do caderno está vazio.');
      return;
    }

    try {
      // 1. Usa o DataService para criar o novo caderno.
      const newNotebookId = await this.dataService.createNotebook(this.newNotebookName.trim());
      console.log('Novo caderno criado com ID:', newNotebookId);

      // 2. Define o caderno recém-criado como o selecionado.
      this.selectedNotebookIdForNote = newNotebookId;

      // 3. Volta para a visualização de seleção do modal.
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
    this.modalErrorMessage = null; // Limpa a mensagem de erro ao resetar
    this.noteCreationFeedbackMessage = null; // Limpa a mensagem de sucesso ao resetar
    this.isCreatingNote = false;
    this.deleteClipAfterConversion = false;
    this.isLoadingNotebooks = false;
  }
}
