import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../services/auth'; // Verifique o caminho do seu serviço
import { Subscription } from 'rxjs';
import { collection, doc, Firestore, onSnapshot, Unsubscribe, addDoc, serverTimestamp, updateDoc, deleteDoc } from '@angular/fire/firestore';

interface Notebook {
  id: string;
  name: string;
  // Adicione outros campos que seu caderno possa ter
}

@Component({
  selector: 'app-cadernos',
  standalone: true,
  imports: [],
  templateUrl: './notebooks.html',
  styleUrl: './notebooks.css'
})
export class Notebooks implements OnInit, OnDestroy {

  private authService = inject(AuthService);
  private firestore = inject(Firestore); // Injeta o Firestore
  private userSubscription: Subscription | null = null;
  private notebooksSubscription: Unsubscribe | null = null;
  
  userId: string | null = null;
  notebooks: Notebook[] = [];
  selectedNotebookId: string | null = null;

  ngOnInit() {
    // 1. Inscreve-se no authState$ para ouvir mudanças de autenticação.
    this.userSubscription = this.authService.authState$.subscribe(user => {
      // 2. Verifica se o objeto 'user' existe (se o usuário está logado).
      if (user) {
        // 3. Se estiver logado, pega o ID do usuário (uid).
        this.userId = user.uid;
        console.log('Usuário logado. ID:', this.userId);
        
        const notebooksCollectionPath = `users/${this.userId}/notebooks`;
        const notebooksCollection = collection(this.firestore, notebooksCollectionPath);

        console.log('Caminho da coleção de cadernos:', notebooksCollectionPath);
        
        // Se já houver uma inscrição, cancele-a antes de criar uma nova.
        this.notebooksSubscription?.();
        
        this.notebooksSubscription = onSnapshot(notebooksCollection, (snapshot) => {
          this.notebooks = snapshot.docs.map(doc => {
            return { id: doc.id, ...doc.data() } as Notebook;
          });
          console.log('Cadernos atualizados:', this.notebooks);
        });
        
      } else {
        // 4. Se não houver usuário (logout), limpa o userId.
        this.userId = null;
        this.notebooks = []; // Limpa a lista de cadernos
        this.selectedNotebookId = null; // Limpa a seleção
        console.log('Usuário deslogado.');
        this.notebooksSubscription?.(); // Cancela a inscrição dos cadernos do usuário anterior
        
        // TODO: Aqui você pode adicionar a lógica para limpar os dados da tela.
      }
    });
  }

  ngOnDestroy() {
    // 5. É fundamental cancelar a inscrição para evitar vazamentos de memória
    // quando o componente for destruído.
    this.userSubscription?.unsubscribe();
    this.notebooksSubscription?.();
    this.selectedNotebookId = null;
  }

  async createNotebook(name: string) {
    // 1. Garante que temos um usuário logado.
    if (!this.userId) {
      console.error('Usuário não está logado. Não é possível criar um caderno.');
      return;
    }

    // 2. Monta a referência para a coleção de cadernos.
    const notebooksCollectionPath = `users/${this.userId}/notebooks`;
    const notebooksCollection = collection(this.firestore, notebooksCollectionPath);

    try {
      // 3. Usa addDoc para criar um novo documento com um ID gerado automaticamente.
      const docRef = await addDoc(notebooksCollection, { name: name, createdAt: serverTimestamp() });
      console.log('Caderno criado com sucesso! ID:', docRef.id);
    } catch (error) {
      console.error('Erro ao criar o caderno:', error);
    }
  }

  async updateNotebook(id: string, newName: string) {
    // 1. Garante que temos um usuário logado.
    if (!this.userId) {
      console.error('Usuário não está logado. Não é possível atualizar o caderno.');
      return;
    }

    // 2. Monta a referência para o documento específico do caderno.
    const docRef = doc(this.firestore, `users/${this.userId}/notebooks/${id}`);

    try {
      // 3. Usa updateDoc para atualizar apenas os campos especificados.
      await updateDoc(docRef, { name: newName });
      console.log('Caderno atualizado com sucesso! ID:', id);
    } catch (error) {
      console.error('Erro ao atualizar o caderno:', error);
    }
  }

  async deleteNotebook(id: string) {
    // 1. Garante que temos um usuário logado.
    if (!this.userId) {
      console.error('Usuário não está logado. Não é possível deletar o caderno.');
      return;
    }

    // 2. Monta a referência para o documento específico do caderno.
    const docRef = doc(this.firestore, `users/${this.userId}/notebooks/${id}`);

    try {
      // 3. Usa deleteDoc para remover o documento.
      await deleteDoc(docRef);
      console.log('Caderno deletado com sucesso! ID:', id);
    } catch (error) {
      console.error('Erro ao deletar o caderno:', error);
    }
  }

  selectNotebook(id: string) {
    this.selectedNotebookId = id;
    console.log('Caderno selecionado:', this.selectedNotebookId);
  }
}