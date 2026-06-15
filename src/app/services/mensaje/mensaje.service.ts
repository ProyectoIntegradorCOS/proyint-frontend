import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

interface ModalMessage {
  text: string;
  type: 'error' | 'warning' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class MensajeService {
  // Usamos Subject para enviar eventos puntuales
  private messageSubject = new Subject<ModalMessage>();

  // Observable público para que el ModalComponent se suscriba
  message$: Observable<ModalMessage> = this.messageSubject.asObservable();

  constructor() {}

  /**
   * Muestra un mensaje modal global.
   */
  showModal(text: string, type: 'error' | 'warning' | 'info' = 'error'): void {
    this.messageSubject.next({ text, type });
  }
} 