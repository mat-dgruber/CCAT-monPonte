import { Injectable, inject, signal, WritableSignal, effect } from '@angular/core';
import { DataService, Notebook, SortBy, SortDirection } from './data.service';
import { AuthService } from './auth';
import { Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotebookService {
  private dataService = inject(DataService);
  private authService = inject(AuthService);

  private notebooksSubscription: Subscription | null = null;

  notebooks: WritableSignal<Notebook[]> = signal([]);
  isLoading: WritableSignal<boolean> = signal(false);
  loadingError: WritableSignal<boolean> = signal(false);

  constructor() {
    this.authService.authState$.subscribe(user => {
      if (user) {
        this.fetchNotebooks();
      } else {
        this.notebooks.set([]);
        this.isLoading.set(false);
        this.loadingError.set(false);
      }
    });
  }

  fetchNotebooks(sortBy: SortBy = 'createdAt', sortDirection: SortDirection = 'desc') {
    if (!this.authService.getCurrentUserId()) {
      return;
    }

    this.isLoading.set(true);
    this.loadingError.set(false);

    this.notebooksSubscription = this.dataService.getNotebooks(sortBy, sortDirection).subscribe({
      next: (notebooks) => {
        this.notebooks.set(notebooks);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Erro ao buscar cadernos:', error);
        this.isLoading.set(false);
        this.loadingError.set(true);
      }
    });
  }

  ngOnDestroy() {
    this.notebooksSubscription?.unsubscribe();
  }
}
