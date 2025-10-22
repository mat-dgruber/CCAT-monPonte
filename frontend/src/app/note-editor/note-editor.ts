import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DataService, Note } from '../services/data.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-note-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="note">
      <input [(ngModel)]="note.title" class="w-full p-2 border rounded-lg" placeholder="Note title">
      <textarea [(ngModel)]="note.content" class="w-full p-2 border rounded-lg mt-2" placeholder="Note content"></textarea>
      <button (click)="saveNote()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mt-2">Save</button>
    </div>
  `
})
export class NoteEditor implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private dataService = inject(DataService);
  private routeSub: Subscription | null = null;

  note: Note | null = null;
  notebookId: string | null = null;

  constructor(private router: Router) {}

  ngOnInit() {
    this.routeSub = this.route.params.subscribe(params => {
      this.notebookId = params['notebookId'];
      const noteId = params['noteId'];
      if (this.notebookId && noteId) {
        this.dataService.getNote(this.notebookId, noteId).subscribe((note: Note | null) => {
          this.note = note;
        });
      }
    });
  }

  ngOnDestroy() {
    this.routeSub?.unsubscribe();
  }

  async saveNote() {
    if (this.note && this.notebookId) {
      await this.dataService.updateNote(this.notebookId, this.note.id, { title: this.note.title, content: this.note.content });
      this.router.navigate(['/notebooks']);
    }
  }
}
