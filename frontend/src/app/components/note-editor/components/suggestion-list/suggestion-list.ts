import { Component, EventEmitter, Input, Output, SimpleChanges, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-suggestion-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="suggestion-list bg-white dark:bg-dark-primary shadow-lg rounded-md border border-gray-200 dark:border-dark-border max-h-60 overflow-y-auto">
      @if (items && items.length) {
        @for (item of items; track item; let i = $index) {
          <button
            (click)="selectItem(item)"
            class="item w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-dark-accent"
            [class.is-selected]="i === selectedIndex">
            {{ item }}
          </button>
        }
      } @else {
        <div class="item px-3 py-2 text-gray-500 dark:text-dark-text-secondary">Nenhuma tag encontrada</div>
      }
    </div>
  `,
  styles: [`
    .is-selected {
      background-color: #eef2ff; /* indigo-100 */
    }
    .dark .is-selected {
      background-color: #3730a3; /* indigo-800 */
    }
  `]
})
export class SuggestionListComponent implements OnChanges {
  @Input() items: string[] = [];
  @Output() itemSelected = new EventEmitter<string>();

  selectedIndex = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items']) {
      this.selectedIndex = 0;
    }
  }

  selectItem(item: string): void {
    this.itemSelected.emit(item);
  }

  // Métodos para navegação por teclado que serão chamados pelo Tiptap
  onKeyDown({ event }: { event: KeyboardEvent }): boolean {
    if (event.key === 'ArrowUp') {
      this.selectedIndex = (this.selectedIndex + this.items.length - 1) % this.items.length;
      return true;
    }
    if (event.key === 'ArrowDown') {
      this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
      return true;
    }
    if (event.key === 'Enter') {
      this.selectItem(this.items[this.selectedIndex]);
      return true;
    }
    return false;
  }
}
