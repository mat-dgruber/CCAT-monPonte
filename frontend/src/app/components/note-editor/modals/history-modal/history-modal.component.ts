import { Component, Input, Output, EventEmitter, inject, signal, WritableSignal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { NoteService } from '../../../../services/note.service';
import { NoteHistory } from '../../../../services/data.service';
import { LucideAngularModule } from 'lucide-angular';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-history-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, DatePipe],
  template: `
    <div class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" @fadeInOut>
      <div class="bg-white dark:bg-dark-panel-middle w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden" @scaleInOut>
        
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
          <h2 class="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <lucide-icon name="history" size="24"></lucide-icon>
            Histórico de Versões
          </h2>
          <button (click)="close.emit()" class="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-accent rounded-full transition-colors">
            <lucide-icon name="x" size="20"></lucide-icon>
          </button>
        </div>

        <div class="flex flex-grow h-full overflow-hidden">
            <!-- Sidebar: Version List -->
            <div class="w-1/3 border-r border-gray-200 dark:border-dark-border overflow-y-auto bg-gray-50 dark:bg-dark-panel">
                @if (isLoading()) {
                    <div class="p-4 text-center text-gray-500">Carregando histórico...</div>
                } @else if (history().length === 0) {
                    <div class="p-4 text-center text-gray-500">Nenhuma versão anterior encontrada.</div>
                } @else {
                    <ul class="divide-y divide-gray-200 dark:divide-dark-border">
                        @for (version of history(); track version.id) {
                            <li (click)="selectVersion(version)" 
                                class="p-4 cursor-pointer hover:bg-white dark:hover:bg-dark-accent transition-colors"
                                [class.bg-white]="selectedVersion()?.id === version.id"
                                [class.dark:bg-dark-accent]="selectedVersion()?.id === version.id">
                                <div class="flex items-center justify-between">
                                    <span class="font-medium text-gray-800 dark:text-gray-200">
                                        {{ version.savedAt?.toDate() | date:'short' }}
                                    </span>
                                </div>
                                <div class="text-xs text-gray-500 mt-1 truncate">
                                    {{ version.content | slice:0:50 }}...
                                </div>
                            </li>
                        }
                    </ul>
                }
            </div>

            <!-- Content Preview -->
            <div class="w-2/3 flex flex-col h-full bg-white dark:bg-dark-panel-middle">
                @if (selectedVersion(); as version) {
                    <div class="flex items-center justify-between p-3 bg-gray-100 dark:bg-dark-accent border-b border-gray-200 dark:border-dark-border">
                         <span class="text-sm text-gray-600 dark:text-gray-300">
                             Visualizando versão de <strong>{{ version.savedAt?.toDate() | date:'medium' }}</strong>
                         </span>
                         <button (click)="restore(version)" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
                             Restaurar Esta Versão
                         </button>
                    </div>
                    <div class="p-6 overflow-y-auto prose dark:prose-invert max-w-none flex-grow" [innerHTML]="version.content">
                    </div>
                } @else {
                    <div class="flex-grow flex items-center justify-center text-gray-500">
                        Selecione uma versão para visualizar
                    </div>
                }
            </div>
        </div>

      </div>
    </div>
  `,
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0 }))
      ])
    ]),
    trigger('scaleInOut', [
      transition(':enter', [
        style({ transform: 'scale(0.95)', opacity: 0 }),
        animate('200ms ease-out', style({ transform: 'scale(1)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ transform: 'scale(0.95)', opacity: 0 }))
      ])
    ])
  ]
})
export class HistoryModalComponent implements OnInit, OnDestroy {
  @Input({ required: true }) noteId!: string;
  @Output() close = new EventEmitter<void>();
  
  noteService = inject(NoteService);
  
  history: WritableSignal<NoteHistory[]> = signal([]);
  isLoading: WritableSignal<boolean> = signal(true);
  selectedVersion: WritableSignal<NoteHistory | null> = signal(null);

  sub: any;

  ngOnInit() {
    this.sub = this.noteService.getHistory(this.noteId).subscribe(data => {
        this.history.set(data);
        this.isLoading.set(false);
    });
  }

  ngOnDestroy() {
      if(this.sub) this.sub.unsubscribe();
  }

  selectVersion(version: NoteHistory) {
      this.selectedVersion.set(version);
  }

  restore(version: NoteHistory) {
      if(confirm('Tem certeza? O conteúdo atual será substituído por esta versão.')) {
          this.noteService.updateNote(this.noteId, { content: version.content }).then(() => {
              this.close.emit();
          });
      }
  }
}
