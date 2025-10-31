import { Component, Input, Output, EventEmitter, WritableSignal, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Notebook } from '../../../services/data.service';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-move-note-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './move-note-modal.component.html',
  styleUrls: ['./move-note-modal.component.css']
})
export class MoveNoteModalComponent {
  @Input() isVisible: boolean = false;
  @Input() notebooks: Notebook[] = [];
  @Input() currentNotebookId: string | null = null;
  @Output() confirm = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  selectedNotebookId: WritableSignal<string | null> = signal(null);

  confirmMove() {
    if (this.selectedNotebookId()) {
      this.confirm.emit(this.selectedNotebookId()!);
    }
  }

  cancelMove() {
    this.cancel.emit();
  }
}
