import { Component, Input, Output, EventEmitter, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Pregunta } from '../../../shared/models/pregunta.model';
import { PreguntaService } from '../../../services/pregunta/pregunta.service';

@Component({
  selector: 'app-pregunta-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pregunta-form.html',
  styleUrl: './pregunta-form.css',
})
export class PreguntaFormComponent implements OnInit, AfterViewInit {

  @Input() pregunta?: Pregunta;
  @Input() idCuestionario!: number;
  @Output() cerrar = new EventEmitter<boolean>();

  @ViewChild('descripcionInput') descripcionInput!: ElementRef<HTMLInputElement>;

  form: Pregunta = {
    idCuestionario: 0,
    descripcion: '',
    tipo: '',
    orden: 1,
    obligatorio: 'S',
    idSiguientePregunta: null,
    opciones: []
  };

  esRegistro = true;

  // MODALES
  mostrarModalValidacion = false;
  mostrarModalConfirmacion = false;
  mensajeModal = '';

  preguntasDisponibles: Pregunta[] = [];

  // Variable para controlar si se muestra la columna "ID siguiente pregunta"
  mostrarColumnaSiguientePregunta = true;


  constructor(private service: PreguntaService) {}

  ngOnInit() {
    this.form.idCuestionario = this.idCuestionario;

    if (this.pregunta) {
      //console.log("pregunta-form, this.pregunta=" + JSON.stringify(this.pregunta,null,2));

      this.form = JSON.parse(JSON.stringify(this.pregunta));
      this.esRegistro = false;

      // 👇 Asegurar que opciones siempre exista
      if (!this.form.opciones) {
        this.form.opciones = [];
      }

    } else {
      this.esRegistro = true;

      // 👇 En registro siempre iniciar vacío
      this.form.opciones = [];
      this.form.obligatorio = 'S';
    }

    this.cargarPreguntasDisponibles();
  }

  ngAfterViewInit() {
    if (this.esRegistro) {
      setTimeout(() => {
        this.descripcionInput.nativeElement.focus();
      }, 0);
    }
  }

  agregarOpcion() {
    if (!this.form.opciones) {
      this.form.opciones = [];
    }

    this.form.opciones.push({
      descripcion: '',
      idSiguientePregunta: null
    });
  }

  // 1️⃣ Se ejecuta al presionar Guardar
  guardar() {
    if (!this.form.descripcion.trim()) {
      this.mensajeModal = 'Ingrese la descripción de la pregunta.';
      this.mostrarModalValidacion = true;
      return;
    }

    if (!this.form.tipo) {
      this.mensajeModal = 'Seleccione el tipo de respuesta.';
      this.mostrarModalValidacion = true;
      return;
    }

    // 👇 VALIDACIÓN ESPECIAL PARA OPCIÓN MÚLTIPLE
    if (this.form.tipo === 'O') {

      if (!this.form.opciones || this.form.opciones.length < 1) {
        this.mensajeModal = 'Debe ingresar al menos una opción.';
        this.mostrarModalValidacion = true;
        return;
      }

      const opcionVacia = this.form.opciones.some(o => !o.descripcion || !o.descripcion.trim());

      if (opcionVacia) {
        this.mensajeModal = 'Todas las opciones deben tener descripción.';
        this.mostrarModalValidacion = true;
        return;
      }
    }

    // Si pasa todas las validaciones
    this.mensajeModal = "¿Desea guardar los datos?";

    this.mostrarModalConfirmacion = true;
  }

  // 2️⃣ Usuario confirma
  confirmarGuardar() {
    this.mostrarModalConfirmacion = false;    
    this.form.idCuestionario = this.idCuestionario;

    const req = this.form.id
      ? this.service.actualizar(this.form.id, this.form)
      : this.service.guardar(this.form);

    req.subscribe(() => {
      this.cerrar.emit(true);
    });
  }

  cerrarModal() {
    this.mostrarModalValidacion = false;
    this.mostrarModalConfirmacion = false;
  }

  onTipoChange(tipo: string) {

  // Si cambia a opción múltiple
  if (tipo === 'O') {
      if (!this.form.opciones || this.form.opciones.length === 0) {
        this.agregarOpcion();
        this.agregarOpcion();
      }
    }
    else {
      // Si cambia a otro tipo, limpiamos opciones
      this.form.opciones = [];
    }
  }


  eliminarOpcion(index: number) {
    this.form.opciones.splice(index, 1);
  }


  cargarPreguntasDisponibles() {
    this.service.listarPorCuestionario(this.idCuestionario).subscribe((preguntas: Pregunta[]) => {
      // Si estamos editando, excluye la pregunta actual
      if (this.pregunta && this.pregunta.id) {
        this.preguntasDisponibles = preguntas.filter(p => p.id !== this.pregunta!.id);
      } else {
        this.preguntasDisponibles = preguntas;
      }
    });
  }

  // Se llama cada vez que cambia el select de "Siguiente pregunta"
  onSiguientePreguntaChange(valor: number | null) {
    // Mostrar columna solo si no hay selección a nivel del formulario
    this.mostrarColumnaSiguientePregunta = valor == null;

    // Si estamos ocultando la columna, limpiar los valores de las opciones
    if (!this.mostrarColumnaSiguientePregunta) {
      this.form.opciones.forEach(o => o.idSiguientePregunta = null);
    }
  }




}
