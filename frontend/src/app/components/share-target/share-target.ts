import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NoteService } from '../../services/note.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-share-target',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center justify-center min-h-screen bg-background dark:bg-dark-primary p-4">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-accent mb-4"></div>
      <p class="text-text dark:text-dark-text text-lg">Processando compartilhamento...</p>
    </div>
  `
})
export class ShareTargetComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private noteService = inject(NoteService);

  ngOnInit() {
    this.route.queryParams.subscribe(async params => {
      const title = params['title'];
      const text = params['text'];
      const url = params['url'];

      if (!title && !text && !url) {
        this.router.navigate(['/']);
        return;
      }

      // Logic:
      // If URL exists, content = text + \n + url.
      // If title missing, use 'Shared Content' or part of text.
      // Auto-save to 'Clip' behavior is probably best, but NoteService creates Notes.
      // Let's create a Note in the active notebook or redirect to Clip page with info?
      // Better: Create a new Note in the first available notebook or "Inbox" equivalent.
      // Since we don't know the notebook, let's redirect to /notebooks with query params to open "Create Note" modal or 
      // redirect to /clip which might be better for "raw" sharing.
      
      // Decision: Connect to Clip Service logic if possible, but user asked for "Note" or "Clip".
      // Let's forward to /clip component passing data via State.
      
      let content = text || '';
      if (url) content += `\n\n${url}`;
      
      this.router.navigate(['/clip'], { 
        queryParams: { 
          sharedTitle: title, 
          sharedContent: content 
        } 
      });
    });
  }
}
