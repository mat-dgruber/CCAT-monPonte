import { Component, Input, Output, EventEmitter, signal, WritableSignal, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Note } from '../services/data.service';

@Component({
  selector: 'app-note-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './note-editor.html',
  styleUrls: ['./note-editor.css']
})
export class NoteEditor implements OnChanges {
  @Input() note: Note | null = null;
  @Output() onSave = new EventEmitter<Note>();
  @Output() onCancel = new EventEmitter<void>();

  editedTitle: WritableSignal<string> = signal('');
  editedContent: WritableSignal<string> = signal('');

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['note'] && this.note) {
      this.editedTitle.set(this.note.title);
      this.editedContent.set(this.note.content);
    }
  }

  save() {
    if (this.note) {
      const updatedNote: Note = {
        ...this.note,
        title: this.editedTitle(),
        content: this.editedContent()
      };
      this.onSave.emit(updatedNote);
    }
  }

  cancel() {
    this.onCancel.emit();
  }
}
