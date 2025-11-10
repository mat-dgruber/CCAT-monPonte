import { Injectable, inject, signal, WritableSignal, computed, OnDestroy } from '@angular/core';
import { DataService, Notebook } from './data.service';
import { AuthService } from './auth';
import { of, Subject } from 'rxjs';
import { switchMap, catchError, takeUntil, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class NotebookService implements OnDestroy {
  private dataService = inject(DataService);
  private authService = inject(AuthService);
  private destroy$ = new Subject<void>();

  // State Signals
  notebooks: WritableSignal<Notebook[]> = signal([]);
  notebooks$ = this.notebooks.asReadonly();
  notebookIds = computed(() => this.notebooks().map(n => n.id));
  isLoading: WritableSignal<boolean> = signal(true);
  loadingError: WritableSignal<boolean> = signal(false);
  isSidebarCollapsed: WritableSignal<boolean> = signal(false);

  constructor() {
    this.authService.authState$.pipe(
      tap(() => {
        this.isLoading.set(true);
        this.loadingError.set(false);
        this.notebooks.set([]);
      }),
      switchMap(user => {
        if (user) {
          return this.dataService.getNotebooks('createdAt', 'desc').pipe(
            catchError(error => {
              console.error('Erro ao buscar cadernos:', error);
              this.loadingError.set(true);
              return of([]); // Retorna um array vazio em caso de erro
            })
          );
        } else {
          return of([]); // Retorna um array vazio se não houver usuário
        }
      }),
      takeUntil(this.destroy$)
    ).subscribe(notebooks => {
      this.notebooks.set(notebooks);
      this.isLoading.set(false);
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSidebar() {
    this.isSidebarCollapsed.update(value => !value);
  }
}
