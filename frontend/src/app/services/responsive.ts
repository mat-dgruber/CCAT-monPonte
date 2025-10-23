import { Injectable, signal, WritableSignal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ResponsiveService {
  isMobile: WritableSignal<boolean> = signal(window.innerWidth < 768);

  constructor() { }

  setIsMobile(isMobile: boolean) {
    this.isMobile.set(isMobile);
  }
}
