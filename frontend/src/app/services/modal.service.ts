import { Injectable, EventEmitter } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  openNoteModalRequest = new EventEmitter<string>();

  openNoteModal(clipContent: string) {
    this.openNoteModalRequest.emit(clipContent);
  }
}
