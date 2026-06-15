import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Cuestionario } from '../../../shared/models/cuestionario.model';
import { CuestionarioService } from '../../../services/cuestionario/cuestionario.service';
import { PreguntaListComponent } from '../pregunta-list/pregunta-list';
import { MetricsService } from '../../../services/metrics/metrics.service';
import { SessionService } from '../../../services/session/session.service';

@Component({
  selector: 'app-cuestionario-form',
  standalone: true,
  imports: [CommonModule, FormsModule, PreguntaListComponent],
  templateUrl: './cuestionario-form.html',
  styleUrl: './cuestionario-form.css',
})
export class CuestionarioFormComponent implements AfterViewInit {

  @Input() cuestionario: Cuestionario | null = null;
  @Output() cerrar = new EventEmitter<boolean>();

  @ViewChild('nombreInput') nombreInput!: ElementRef<HTMLInputElement>;

  form: Cuestionario = {
    id: 0,
    nombre: '',
    descripcion: '',
    estado: 1
  };

  // ===== MODALES =====
  mostrarModalMensaje = false;
  mensajeModal = '';

  mostrarModalConfirmacion = false;

  modo: 'registro' | 'edicion' = 'registro';

  //Permisos
  mostrarEditar: boolean = false;


  constructor(
    private service: CuestionarioService,
    private metricsService: MetricsService,
    private sessionService: SessionService
  ) {}

  ngOnInit() {

    //Permisos    
    this.mostrarEditar = this.sessionService.tienePermiso("cuestionario.editar");

    if (this.cuestionario) {
      this.form = { ...this.cuestionario };
      this.modo = 'edicion';
    }

  }

  ngAfterViewInit() {
    // Solo enfocar si es NUEVO (no edición)
    if (!this.cuestionario) {
      setTimeout(() => {
        this.nombreInput?.nativeElement.focus();
      }, 100);
    }
  }

  // =========================
  // VALIDAR Y CONFIRMAR
  // =========================
  confirmarGuardar() {

    if (!this.form.nombre || this.form.nombre.trim().length === 0) {
      this.mensajeModal = 'Debe ingresar el nombre del cuestionario.';
      this.mostrarModalMensaje = true;
      return;
    }
    this.mostrarModalConfirmacion = true;
  }

  // =========================
  // GUARDAR
  // =========================
  aceptarGuardar() {
    this.mostrarModalConfirmacion = false;

    const req = this.form.id
      ? this.service.actualizar(this.form.id, this.form)
      : this.service.guardar(this.form);

    const inicio = Date.now();
    const action = this.form.id ? 'cuestionario_actualizar' : 'cuestionario_crear';

    req.subscribe({
      next: () => {
        // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-23 11:51 UTC-5 (Lima)][desc: Registra métricas de creación/actualización de cuestionarios][obj: CuestionarioFormComponent.aceptarGuardar]
        this.metricsService.trackEvent({
          action,
          screen: 'cuestionarios',
          status: 'success',
          durationMs: Date.now() - inicio
        });
        this.cerrar.emit(true);
      },
      error: () => {
        this.metricsService.trackEvent({
          action,
          screen: 'cuestionarios',
          status: 'error',
          durationMs: Date.now() - inicio
        });
      }
    });
  }

  cancelarGuardar() {
    this.mostrarModalConfirmacion = false;
  }

  // =========================
  // MODAL MENSAJE
  // =========================
  cerrarMensajeModal() {
    this.mostrarModalMensaje = false;
  }

  cancelar() {
    this.cerrar.emit(false);
  }
}
