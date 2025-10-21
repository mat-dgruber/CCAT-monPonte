import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../services/auth'; // Verifique o caminho do seu serviço
import { Subscription } from 'rxjs';
import { NotesList } from '../notes-list/notes-list'; // Importa o NotesList
import { DataService, Notebook } from '../services/data.service';

@Component({
  selector: 'app-cadernos',
  standalone: true,
  imports: [NotesList], // Adiciona NotesList aos imports
  templateUrl: './notebooks.html',
  styleUrl: './notebooks.css'
})
export class Notebooks implements OnInit, OnDestroy {

  private authService = inject(AuthService);
  private dataService = inject(DataService);
  
  userId: string | null = null;
  notebooks: Notebook[] = [];
  selectedNotebookId: string | null = null;

  ngOnInit() {
    // 1. Inscreve-se no authState$ para ouvir mudanças de autenticação.
    this.authService.authState$.subscribe(user => {
      // 2. Verifica se o objeto 'user' existe (se o usuário está logado).
      if (user) {
        // 3. Se estiver logado, pega o ID do usuário (uid).
        this.userId = user.uid;
        console.log('Usuário logado. ID:', this.userId);
                
        // Usa o DataService para obter os cadernos
        this.dataService.getNotebooks().subscribe(notebooks => {
          this.notebooks = notebooks;
          console.log('Cadernos atualizados:', this.notebooks);
        });
      } else {
        // 4. Se não houver usuário (logout), limpa o userId.
        this.userId = null;
        this.notebooks = []; // Limpa a lista de cadernos
        this.selectedNotebookId = null; // Limpa a seleção
        console.log('Usuário deslogado.');
        
        // TODO: Aqui você pode adicionar a lógica para limpar os dados da tela.
      }
    });
  }

  ngOnDestroy() {
    // 5. É fundamental cancelar a inscrição para evitar vazamentos de memória
    // quando o componente for destruído.
    this.selectedNotebookId = null;
  }

  async createNotebook(name: string) {
    // 1. Garante que temos um usuário logado.
    if (!this.userId) {
      console.error('Usuário não está logado. Não é possível criar um caderno.');
      return;
    }

    try {
      // Delega a criação para o DataService
      const newId = await this.dataService.createNotebook(name);
      console.log('Caderno criado com sucesso! ID:', newId);
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

    try {
      // Delega a atualização para o DataService
      await this.dataService.updateNotebook(id, newName);
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

    try {
      // Delega a exclusão para o DataService
      await this.dataService.deleteNotebook(id);
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