import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.html',
  styleUrls: ['./modal.css'] // Você pode criar um modal.css se precisar de estilos específicos não-Tailwind
})
export class Modal {
  @Input() isOpen: boolean = false;
  @Input() title: string = '';
  @Input() message: string = '';
  @Input() confirmText: string = 'Confirmar';
  @Input() cancelText: string = 'Cancelar';
  @Input() showCancelButton: boolean = true; // Permite esconder o botão de cancelar

  @Output() onConfirm = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>(); // Changed from onCancel to close

  // Métodos para emitir eventos
  confirm(): void {
    this.onConfirm.emit();
  }
  // Renamed cancel to close and emit the close event
  cancel(): void {
    this.close.emit();
  }
}