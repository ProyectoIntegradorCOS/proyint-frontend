import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Opcion } from '../../../shared/models/opcion.model';

@Component({
  selector: 'app-opcion-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './opcion-form.html',
  styleUrl: './opcion-form.css',
})
export class OpcionFormComponent {

  @Input() opcion?: Opcion;
  @Output() guardar = new EventEmitter<Opcion>();
  @Output() cancelar = new EventEmitter<void>();

  form: Opcion = {
    descripcion: '',
    idSiguientePregunta: null
  };

  ngOnInit() {
    if (this.opcion) {
      this.form = JSON.parse(JSON.stringify(this.opcion));
    }
  }

  aceptar() {
    if (!this.form.descripcion || this.form.descripcion.trim().length === 0) {
      return;
    }
    this.guardar.emit(this.form);
  }
}
