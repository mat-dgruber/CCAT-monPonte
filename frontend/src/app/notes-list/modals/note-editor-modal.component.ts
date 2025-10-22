import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Note } from '../../services/data.service'; // Assuming Note interface is in data.service

@Component({
  selector: 'app-note-editor-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isVisible()) {
      <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
        <div class="relative p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
          <div class="mt-3 text-center">
            <h3 class="text-lg leading-6 font-medium text-gray-900">{{ isEditing() ? 'Editar Nota' : 'Criar Nova Nota' }}</h3>
            <div class="mt-2 px-7 py-3">
              <form #noteForm="ngForm" (ngSubmit)="onSave()">
                <div class="mb-4 text-left">
                  <label for="noteTitle" class="block text-sm font-medium text-gray-700">Título</label>
                  <input
                    type="text"
                    id="noteTitle"
                    name="noteTitle"
                    [(ngModel)]="editedTitle"
                    required
                    #titleInput="ngModel"
                    [class.border-red-500]="titleInput.invalid && (titleInput.dirty || titleInput.touched)"
                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                  @if (titleInput.invalid && (titleInput.dirty || titleInput.touched)) {
                    <p class="mt-1 text-sm text-red-600">
                      @if (titleInput.errors?.['required']) { O título é obrigatório. }
                    </p>
                  }
                </div>
                <div class="mb-4 text-left">
                  <label for="noteContent" class="block text-sm font-medium text-gray-700">Conteúdo</label>
                  <textarea
                    id="noteContent"
                    name="noteContent"
                    rows="5"
                    [(ngModel)]="editedContent"
                    required
                    #contentInput="ngModel"
                    [class.border-red-500]="contentInput.invalid && (contentInput.dirty || contentInput.touched)"
                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  ></textarea>
                  @if (contentInput.invalid && (contentInput.dirty || contentInput.touched)) {
                    <p class="mt-1 text-sm text-red-600">
                      @if (contentInput.errors?.['required']) { O conteúdo é obrigatório. }
                    </p>
                  }
                </div>
                <div class="items-center px-4 py-3 flex justify-center gap-3">
                  <button
                    type="submit"
                    [disabled]="!noteForm.form.valid || isSaving()"
                    class="px-4 py-2 bg-indigo-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:text-sm disabled:bg-indigo-400 disabled:cursor-not-allowed"
                  >
                    @if (isSaving()) {
                      <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    }
                    <span>{{ isSaving() ? 'Salvando...' : 'Salvar' }}</span>
                  </button>
                  <button
                    type="button"
                    (click)="onCancel()"
                    class="px-4 py-2 bg-white text-gray-700 text-base font-medium rounded-md shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 sm:text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class NoteEditorModalComponent implements OnChanges {
  @Input() isVisible: WritableSignal<boolean> = signal(false);
  @Input() note: WritableSignal<Partial<Note>> = signal({});
  @Input() isEditing: WritableSignal<boolean> = signal(false);
  @Input() isSaving: WritableSignal<boolean> = signal(false); // Novo input para o estado de carregamento

  @Output() saveNote = new EventEmitter<Partial<Note>>();
  @Output() closeModal = new EventEmitter<void>();

  editedTitle: string = '';
  editedContent: string = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['note'] && this.note()) {
      this.editedTitle = this.note().title || '';
      this.editedContent = this.note().content || '';
    }
    // Quando o modal se torna visível para uma nova nota, limpa os campos
    if (changes['isVisible'] && this.isVisible() && !this.isEditing()) {
      this.editedTitle = '';
      this.editedContent = '';
    }
  }

  onSave() {
    if (this.editedTitle && this.editedContent) {
      const noteToSave: Partial<Note> = {
        id: this.note().id, // Preserva o ID se estiver editando
        title: this.editedTitle,
        content: this.editedContent,
      };
      this.saveNote.emit(noteToSave);
    }
  }

  onCancel() {
    this.closeModal.emit();
  }
}