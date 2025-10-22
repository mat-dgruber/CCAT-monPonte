import { Injectable, signal, WritableSignal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  toasts: WritableSignal<Toast[]> = signal([]);
  private nextId = 0;

  show(message: string, type: 'success' | 'error' | 'info' = 'info', duration = 4000) {
    const newToast: Toast = { id: this.nextId++, message, type, duration };

    this.toasts.update(currentToasts => [...currentToasts, newToast]);

    if (duration > 0) {
      setTimeout(() => this.remove(newToast.id), duration);
    }
  }

  showSuccess(message: string, duration = 3000) {
    this.show(message, 'success', duration);
  }

  showError(message: string, duration = 5000) {
    this.show(message, 'error', duration);
  }

  remove(toastId: number) {
    this.toasts.update(currentToasts => currentToasts.filter(toast => toast.id !== toastId));
  }
}