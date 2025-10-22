import { Component, inject, OnInit, OnDestroy, HostListener, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Firestore, doc, DocumentReference, onSnapshot, Unsubscribe, setDoc, serverTimestamp, Timestamp } from '@angular/fire/firestore';
import { AuthService } from '../services/auth';
import { DataService, Notebook } from '../services/data.service';
import { NotificationService } from '../services/notification.service';
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
  private notificationService = inject(NotificationService);
  private userSubscription: Subscription | null = null;
  private snapshotSubscription: Unsubscribe | null = null;
  private textChangeSubject = new Subject<string>();
  private textChangeSubscription: Subscription | null = null;
  private notebooksSubscription: Subscription | null = null;
  private typewriterInterval: any = null; // Para controlar o efeito de digitação
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
  isCreatingNote = false; // Para controlar o spinner
  deleteClipAfterConversion = false;
  isLoadingNotebooks = false;

  // Contadores de caracteres e palavras
  characterCount: WritableSignal<number> = signal(0);
  wordCount: WritableSignal<number> = signal(0);

  // Variáveis para a seleção de fonte
  selectedFont: WritableSignal<string> = signal("'Courier Prime', monospace");
  availableFonts = [
    { name: 'Padrão', family: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif" },
    { name: 'Monoespaçado', family: "'Roboto Mono', monospace" },
    { name: 'Manuscrito', family: "'Caveat', cursive" },
    { name: 'Serifado', family: "'Georgia', serif" }
  ];

  // Variáveis para o tamanho da fonte
  selectedFontSize: WritableSignal<string> = signal('16px');
  availableFontSizes = [
    { name: 'Pequeno', size: '14px' },
    { name: 'Médio', size: '16px' },
    { name: 'Grande', size: '20px' },
    { name: 'Extra Grande', size: '24px' }
  ];

  ngOnInit() {
    // Carrega a preferência de fonte do usuário
    const savedFont = localStorage.getItem('clipFontPreference');
    if (savedFont) {
      this.selectedFont.set(savedFont);
    }

    // Carrega a preferência de tamanho de fonte do usuário
    const savedFontSize = localStorage.getItem('clipFontSizePreference');
    if (savedFontSize) {
      this.selectedFontSize.set(savedFontSize);
    }

    this.userSubscription = this.authService.authState$.subscribe(user => {
      if (user) {
        this.userId = user.uid;
        this.docRef = doc(this.firestore, `clip/${this.userId}`);
        this.snapshotSubscription = onSnapshot(this.docRef, (docSnap) => {
          // Ignora atualizações locais para não interferir com a digitação do usuário
          if (docSnap.metadata.hasPendingWrites) {
            return;
          }

          if (docSnap.exists()) {
            const data = docSnap.data();
            const text = data['text'] ?? '';
            const expiresAt = data['expiresAt'] as Timestamp | undefined;

            // Verifica se o clip expirou
            if (expiresAt && new Date() > expiresAt.toDate()) {
              console.log('Clip expirado. Limpando o texto.');
              this.typewriterEffect(''); // Limpa com efeito
            } else {
              // Se não expirou, exibe o texto com efeito de máquina de escrever
              this.typewriterEffect(text);
              console.log('Document data updated:', this.copyText);
            }
          } else {
            // O documento ainda não existe para este usuário.
            console.log('No document found for this user.');
            this.typewriterEffect('');
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
    this.notificationService.showSuccess('Clip salvo!');
  }

  @HostListener('window:keydown.control.d', ['$event'])
  handleClearKeyboardEvent(event: Event) {
    event.preventDefault(); // Impede a ação padrão do navegador (ex: Adicionar aos Favoritos)
    this.clearText();
    console.log('Clip cleared via Ctrl+D');
    this.notificationService.showSuccess('Clip limpo!');
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
      this.notificationService.showSuccess('Copiado para a área de transferência!');
      console.log('Text copied to clipboard');
    } catch (error) {
      this.notificationService.showError('Falha ao copiar!');
      console.error('Failed to copy text: ', error);
    }
  }

  onTextChange(text: string) {
    this.updateCounts(text);
    this.textChangeSubject.next(text);
  }

  clearText() {
    this.copyText = '';
    this.updateCounts('');
    this.onTextChange(''); // Notifica o subject para salvar o estado vazio
  }

  // Altera a fonte e salva a preferência
  onFontChange(event: Event) {
    const selectedValue = (event.target as HTMLSelectElement).value;
    this.selectedFont.set(selectedValue);
    localStorage.setItem('clipFontPreference', selectedValue);
  }

  // Altera o tamanho da fonte e salva a preferência
  onFontSizeChange(event: Event) {
    const selectedValue = (event.target as HTMLSelectElement).value;
    this.selectedFontSize.set(selectedValue);
    localStorage.setItem('clipFontSizePreference', selectedValue);
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
      this.notificationService.showError('Por favor, selecione um caderno para salvar a nota.');
      return;
    }

    // 2. Define o título, usando um fallback se estiver vazio.
    const title = this.newNoteTitle.trim() || this.copyText.substring(0, 20) + '...';

    this.isCreatingNote = true;

    try {
      // 3. Chama o serviço para criar a nota com os dados coletados.
      await this.dataService.createNote(
        this.selectedNotebookIdForNote,
        title,
        this.copyText // O conteúdo da nota é o texto do Clip.
      );
      console.log('Nota criada com sucesso a partir do Clip!');
      this.notificationService.showSuccess('Nota criada com sucesso!');

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
      this.notificationService.showError('Ocorreu um erro ao salvar a nota. Tente novamente.');
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
    this.isCreatingNote = false;
    this.deleteClipAfterConversion = false;
    this.isLoadingNotebooks = false;
  }

  private typewriterEffect(text: string, speed: number = 20) {
    // Se o texto a ser digitado for o mesmo que já está na tela, não faz nada.
    if (this.copyText === text) return;

    // Se já houver um efeito de digitação em andamento, limpa o intervalo.
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
    }

    this.copyText = ''; // Começa com o texto vazio
    let i = 0;
    this.typewriterInterval = setInterval(() => {
      if (i < text.length) {
        this.copyText += text.charAt(i);
        i++;
      } else {
        clearInterval(this.typewriterInterval);
      }
    }, speed);
  }

  private updateCounts(text: string): void {
    this.characterCount.set(text.length);

    const trimmedText = text.trim();
    if (trimmedText === '') {
      this.wordCount.set(0);
    } else {
      const words = trimmedText.split(/\s+/);
      this.wordCount.set(words.length);
    }
  }
}
