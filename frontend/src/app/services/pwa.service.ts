import { Injectable, signal, WritableSignal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PwaService {
  installPrompt: WritableSignal<any> = signal(null);

  constructor() {
    this.initPwaPrompt();
  }

  private initPwaPrompt() {
    console.log('PwaService: Initializing PWA prompt listener');
    
    // Check if event was captured before service init
    if ((window as any).deferredPrompt) {
      console.log('PwaService: Found pre-captured event');
      this.installPrompt.set((window as any).deferredPrompt);
      (window as any).deferredPrompt = null;
    }

    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      console.log('PwaService: beforeinstallprompt event fired!');
      this.installPrompt.set(e);
    });

    window.addEventListener('appinstalled', () => {
      console.log('PwaService: App installed');
      this.installPrompt.set(null);
    });
  }

  async installApp() {
    const prompt = this.installPrompt();
    if (!prompt) return;

    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    this.installPrompt.set(null);
  }
}
