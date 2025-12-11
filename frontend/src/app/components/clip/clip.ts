import { Component, inject, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';
import { ClipService } from '../../services/clip.service';
import { ThemeService } from '../../services/theme';
import { ModalService } from '../../services/modal.service';

import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-clip',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './clip.html',
  styleUrls: ['./clip.css']
})
export class Clip {
  
  clipService = inject(ClipService);
  themeService = inject(ThemeService);
  private notificationService = inject(NotificationService);
  private modalService = inject(ModalService);
  private route = inject(ActivatedRoute);

  constructor() {
    this.route.queryParams.subscribe(params => {
      const sharedContent = params['sharedContent'];
      if (sharedContent) {
        // Append or replace? Let's append if there is existing text, or just set it.
        // Assuming user wants to save what they shared. 
        // Let's just set it for now, or append with new line.
        const currentText = this.clipService.copyText();
        const newText = currentText ? `${currentText}\n\n${sharedContent}` : sharedContent;
        this.clipService.onTextChange(newText);
        this.clipService.saveClip(newText); // Auto save
        this.notificationService.showSuccess('Conteúdo compartilhado recebido!');
      }
    });
  }

  availableFonts = [
    { name: 'Padrão', family: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif" },
    { name: 'Manuscrito', family: "'Caveat', cursive" },
    { name: 'Serifado', family: "'Georgia', serif" }
  ];

  availableFontSizes = [
    { name: 'Pequeno', size: '14px' },
    { name: 'Médio', size: '16px' },
    { name: 'Grande', size: '20px' },
    { name: 'Extra Grande', size: '24px' }
  ];

  @HostListener('window:keydown.control.s', ['$event'])
  handleKeyboardEvent(event: Event) {
    event.preventDefault();
    this.clipService.saveClip(this.clipService.copyText());
    this.notificationService.showSuccess('Clip salvo!');
  }
  
  @HostListener('window:keydown.control.d', ['$event'])
  handleClearKeyboardEvent(event: Event) {
    event.preventDefault();
    this.clearText();
    this.notificationService.showSuccess('Clip limpo!');
  }
  
  @HostListener('window:keydown.control.shift.c', ['$event'])
  handleCopyKeyboardEvent(event: Event) {
    event.preventDefault();
    this.onCopy();
  }
  
  @HostListener('window:keydown.control.m', ['$event'])
  handleOpenModalKeyboardEvent(event: Event) {
    event.preventDefault();
    this.openConvertToNoteModal();
  }
  
  onTextChange(text: string) {
    this.clipService.onTextChange(text);
  }

  clearText() {
    this.clipService.onTextChange('');
  }

  async onCopy() {
    try {
      await navigator.clipboard.writeText(this.clipService.copyText());
      this.notificationService.showSuccess('Copiado para a área de transferência!');
    } catch (error) {
      this.notificationService.showError('Falha ao copiar!');
    }
  }

  onFontChange(event: Event) {
    const selectedValue = (event.target as HTMLSelectElement).value;
    this.clipService.setSelectedFont(selectedValue);
  }

  onFontSizeChange(event: Event) {
    const selectedValue = (event.target as HTMLSelectElement).value;
    this.clipService.setSelectedFontSize(selectedValue);
  }

  openConvertToNoteModal() {
    this.modalService.openNoteModal(this.clipService.copyText());
  }
}
