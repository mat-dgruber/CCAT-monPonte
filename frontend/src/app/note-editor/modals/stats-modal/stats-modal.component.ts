import { Component, Input, Output, EventEmitter, computed, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Note } from '../../../services/data.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-stats-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './stats-modal.component.html',
  styleUrls: ['./stats-modal.component.css']
})
export class StatsModalComponent {
  @Input() isVisible: boolean = false;
  @Input() note: Note | null = null;
  @Output() close = new EventEmitter<void>();

  wordCount: Signal<number> = computed(() => {
    if (!this.note?.content) return 0;
    return this.note.content.trim().split(/\s+/).filter((word: string) => word.length > 0).length;
  });

  characterCount: Signal<number> = computed(() => {
    return this.note?.content?.length || 0;
  });

  closeModal() {
    this.close.emit();
  }
}
