import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ClipService } from '../../services/clip.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-widget',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="h-screen w-full bg-background dark:bg-dark-primary p-4 flex flex-col items-center justify-center text-center">
      <img src="assets/logo-ccat.png" alt="Logo" class="w-12 h-12 mb-2">
      <h2 class="text-xl font-bold text-text dark:text-white mb-1">monClip</h2>
      <p class="text-sm text-text-secondary dark:text-gray-400 mb-4">Acesso Rápido</p>
      
      <div class="w-full space-y-2">
        <button (click)="openClip()" class="w-full flex items-center justify-center gap-2 bg-accent text-white py-2 px-4 rounded-lg font-medium hover:bg-opacity-90 transition-all">
           <lucide-icon name="clipboard" size="18"></lucide-icon>
           Abrir Clip
        </button>
        <button (click)="openNotebooks()" class="w-full flex items-center justify-center gap-2 bg-neutral dark:bg-dark-accent text-text dark:text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">
           <lucide-icon name="book-open-text" size="18"></lucide-icon>
           Cadernos
        </button>
      </div>

       <div class="mt-4 text-xs text-gray-500">
         {{ clipService.wordCount() }} palavras no Clip
       </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
  `]
})
export class WidgetComponent {
  clipService = inject(ClipService);

  openClip() {
    window.open('/clip', '_blank');
  }

  openNotebooks() {
    window.open('/notebooks', '_blank');
  }
}
