import { Component, inject, Input, OnChanges, SimpleChanges, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';

import { DataService, Note } from '../services/data.service';
import { NotificationService } from '../services/notification.service';
import { Modal } from '../modal/modal';

@Component({
  selector: 'app-note-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, Modal],
  templateUrl: './note-editor.html',
  styleUrls: ['./note-editor.css']
})
export class NoteEditor implements OnChanges {
  @Input() notebookId: string | null = null;
  @Input() noteId: string | null = null;

  private dataService = inject(DataService);
  private notificationService = inject(NotificationService);

  note: WritableSignal<Note | null> = signal(null);
  isLoading: WritableSignal<boolean> = signal(true);
  isSaving: WritableSignal<boolean> = signal(false);
  showDeleteConfirmationModal: WritableSignal<boolean> = signal(false);

  private contentChanges = new Subject<void>();
  private autoSaveSubscription: Subscription;

  constructor() {
    this.autoSaveSubscription = this.contentChanges.pipe(
      debounceTime(1000)
    ).subscribe(() => this.saveNote());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['noteId'] || changes['notebookId'])) {
      this.fetchNote();
    }
  }

  ngOnDestroy(): void {
    this.autoSaveSubscription.unsubscribe();
  }

  fetchNote(): void {
    if (this.notebookId && this.noteId) {
      this.isLoading.set(true);
      this.dataService.getNote(this.notebookId, this.noteId).subscribe(note => {
        if (note) {
          this.note.set(note);
        } else {
          this.note.set(null);
          this.notificationService.showError("Nota não encontrada.");
        }
        this.isLoading.set(false);
      });
    } else {
      this.note.set(null);
    }
  }

  async saveNote() {
    if (!this.notebookId || !this.noteId || !this.note()) return;
    this.isSaving.set(true);
    try {
      await this.dataService.updateNote(this.notebookId, this.noteId, this.note()!);
    } catch (error) {
      this.notificationService.showError("Erro ao salvar a nota.");
    } finally {
      this.isSaving.set(false);
    }
  }

  onContentChange(): void {
    this.contentChanges.next();
  }

  deleteNote(): void {
    this.showDeleteConfirmationModal.set(true);
  }

  async confirmDeleteNote(): Promise<void> {
    if (!this.notebookId || !this.noteId) return;

    try {
      await this.dataService.deleteNote(this.notebookId, this.noteId);
      this.notificationService.showSuccess("Nota deletada com sucesso.");
      this.showDeleteConfirmationModal.set(false);
      this.note.set(null); // Clear the note editor
    } catch (error) {
      this.notificationService.showError("Erro ao deletar a nota.");
    }
  }

  cancelDeleteNote(): void {
    this.showDeleteConfirmationModal.set(false);
  }
}