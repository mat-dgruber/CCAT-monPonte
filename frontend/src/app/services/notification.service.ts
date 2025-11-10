import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  toasts = signal<Toast[]>([]);

  showSuccess(message: string, duration = 3000) {
    this.addToast(message, 'success', duration);
  }

  showError(message: string, duration = 5000) {
    this.addToast(message, 'error', duration);
  }

  showInfo(message: string, duration = 3000) {
    this.addToast(message, 'info', duration);
  }

  private addToast(message: string, type: ToastType, duration: number) {
    const id = Math.random().toString(36).substring(2, 9);
    this.toasts.update(currentToasts => [
      ...currentToasts,
      { id, message, type, duration }
    ]);

    setTimeout(() => {
      this.remove(id);
    }, duration);
  }

  remove(toastId: string) {
    this.toasts.update(currentToasts => currentToasts.filter(toast => toast.id !== toastId));
  }
}