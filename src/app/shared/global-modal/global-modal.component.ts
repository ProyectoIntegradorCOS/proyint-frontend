import { Component, OnInit } from '@angular/core';
import { MensajeService } from '../../services/mensaje/mensaje.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-global-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isVisible) {
      <div class="modal-backdrop-global">
        <div class="modal-content-global">
          <h3>{{ type === 'warning' ? 'Advertencia' : 'Mensaje' }}</h3>
          <p>{{ text }}</p>
          <div class="button-container">
            <button class="boton" (click)="hideModal()">Aceptar</button>
          </div>
        </div>
      </div>
    }
  `,
  styleUrls: ['./global-modal.component.css']
})
export class GlobalModalComponent implements OnInit {
  isVisible = false;
  text = '';
  type = 'info';

  constructor(private mensajeService: MensajeService) {}

  ngOnInit(): void {
    this.mensajeService.message$.subscribe(message => {
      this.text = message.text;
      this.type = message.type;
      this.isVisible = true;
    });
  }

  hideModal(): void {
    this.isVisible = false;
  }
}