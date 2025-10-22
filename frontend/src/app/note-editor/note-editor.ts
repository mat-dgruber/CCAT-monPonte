import { Component, inject, OnInit, OnDestroy, signal, WritableSignal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription, debounceTime, switchMap, of } from 'rxjs';

import { DataService, Note } from '../services/data.service';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-note-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './note-editor.html',
  styleUrls: ['./note-editor.css']
})
export class NoteEditor implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dataService = inject(DataService);
  private notificationService = inject(NotificationService);

  note: WritableSignal<Note | null> = signal(null);
  isLoading: WritableSignal<boolean> = signal(true);
  isSaving: WritableSignal<boolean> = signal(false);

  private notebookId: string | null = null;
  private noteId: string | null = null;

  private contentChanges = new Subject<void>();
  private subscriptions = new Subscription();

  constructor() {
    // Efeito para salvar automaticamente
    effect(() => {
      const currentNote = this.note();
      if (currentNote) {
        this.onContentChange();
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    const routeSub = this.route.paramMap.pipe(
      switchMap(params => {
        this.notebookId = params.get('notebookId');
        this.noteId = params.get('noteId');

        if (this.notebookId && this.noteId) {
          this.isLoading.set(true);
          return this.dataService.getNote(this.notebookId, this.noteId);
        }
        return of(null);
      })
    ).subscribe(note => {
      if (note) {
        this.note.set(note);
      } else {
        this.notificationService.showError("Nota não encontrada.");
        this.router.navigate(['/notebooks']);
      }
      this.isLoading.set(false);
    });

    const autoSaveSub = this.contentChanges.pipe(
      debounceTime(1500) // Salva 1.5s após a última alteração
    ).subscribe(() => {
      this.saveNote();
    });

    this.subscriptions.add(routeSub);
    this.subscriptions.add(autoSaveSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  async saveNote() {
    if (!this.notebookId || !this.noteId || !this.note()) return;
    this.isSaving.set(true);
    await this.dataService.updateNote(this.notebookId, this.noteId, { ...this.note()! });
    this.isSaving.set(false);
  }

  onContentChange(): void {
    this.contentChanges.next();
  }
}