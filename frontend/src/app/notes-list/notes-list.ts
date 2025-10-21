import { Component, Input, OnChanges, OnDestroy, SimpleChanges, inject } from '@angular/core';
import { collection, doc, Firestore, onSnapshot, Unsubscribe, addDoc, serverTimestamp, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { AuthService } from '../services/auth';
import { DataService } from '../services/data.service';
import { Subscription } from 'rxjs';

interface Note {
  id: string;
  title: string;
  content: string;
  // Adicione outros campos que sua nota possa ter
}

@Component({
  selector: 'app-notes-list',
  standalone: true,
  imports: [],
  templateUrl: './notes-list.html',
  styleUrl: './notes-list.css',
})
export class NotesList implements OnChanges, OnDestroy {
  @Input({ required: true }) notebookId!: string;
  @Input() selectedNoteId: string | null = null;

  private authService = inject(AuthService);
  private dataService = inject(DataService);
  private userSubscription: Subscription | null = null;

  userId: string | null = null;
  notes: Note[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    // 1. Reage quando o notebookId muda
    if (changes['notebookId']) {
      this.userSubscription = this.authService.authState$.subscribe(user => {
        if (user) {
          this.userId = user.uid;
          // Usa o serviço para obter as notas
                    this.dataService.getNotes(this.notebookId).subscribe((notes: Note[]) => {
            this.notes = notes;
            console.log(`Notas do caderno ${this.notebookId}:`, this.notes);
          });
        }
      });
    }
  }

  selectNote(noteId: string) {
    this.selectedNoteId = noteId;
  }

  ngOnDestroy(): void {
    // 4. Garante que todas as inscrições sejam canceladas ao destruir o componente
    this.userSubscription?.unsubscribe();
  }

  async createNote(title: string, content: string) {
    // 1. Garante que temos um usuário e um caderno selecionado.
    if (!this.userId || !this.notebookId) {
      console.error('Usuário ou caderno não selecionado. Não é possível criar a nota.');
      return;
    }

    try {
      const newId = await this.dataService.createNote(this.notebookId, title, content);
      console.log('Nota criada com sucesso! ID:', newId);
    } catch (error) {
      console.error('Erro ao criar a nota:', error);
    }
  }

  async updateNote(noteId: string, data: { title?: string, content?: string }) {
    // 1. Garante que temos um usuário e um caderno selecionado.
    if (!this.userId || !this.notebookId) {
      console.error('Usuário ou caderno não selecionado. Não é possível atualizar a nota.');
      return;
    }

    try {
      await this.dataService.updateNote(this.notebookId, noteId, data);
      console.log('Nota atualizada com sucesso! ID:', noteId);
    } catch (error) {
      console.error('Erro ao atualizar a nota:', error);
    }
  }

  async deleteNote(noteId: string) {
    // 1. Garante que temos um usuário e um caderno selecionado.
    if (!this.userId || !this.notebookId) {
      console.error('Usuário ou caderno não selecionado. Não é possível deletar a nota.');
      return;
    }

    try {
      await this.dataService.deleteNote(this.notebookId, noteId);
      console.log('Nota deletada com sucesso! ID:', noteId);
    } catch (error) {
      console.error('Erro ao deletar a nota:', error);
    }
  }
}
