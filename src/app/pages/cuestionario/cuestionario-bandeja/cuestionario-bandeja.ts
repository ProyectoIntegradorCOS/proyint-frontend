import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CuestionarioService } from '../../../services/cuestionario/cuestionario.service';
import { Cuestionario } from '../../../shared/models/cuestionario.model';
import { CuestionarioFormComponent } from '../cuestionario-form/cuestionario-form';
import { SessionService } from '../../../services/session/session.service';

@Component({
  selector: 'app-cuestionario-bandeja',
  standalone: true,
  imports: [CommonModule, FormsModule, CuestionarioFormComponent],
  templateUrl: './cuestionario-bandeja.html',
  styleUrl: './cuestionario-bandeja.css'
})
export class CuestionarioBandejaComponent implements OnInit {

  // ====== FILTROS ======
  filtroNombre: string | null = null;

  // ====== DATOS ======
  cuestionarios = signal<Cuestionario[]>([]);
  totalRegistros = 0;

  // ====== PAGINACIÓN ======
  paginaActual = 1;
  tamanioPagina = 10;
  totalPaginas = 0;
  paginas: number[] = [];
  // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-16 12:31 UTC-5 (Lima)][desc: Soporta MaterialLocalizations para es_PE/es_ES (historial por fecha)][obj: CuestionarioBandejaComponent respuesta raw]
  respuestaRaw: string | null = null;

  // ====== MODAL FORM ======
  mostrarModal = signal(false);
  seleccionado = signal<Cuestionario | null>(null);

  // ====== MODAL ELIMINAR ======
  mostrarModalEliminar = false;
  // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-16 11:47 UTC-5 (Lima)][desc: Soporta MaterialLocalizations para es_PE/es_ES (historial por fecha)][obj: CuestionarioBandejaComponent eliminar warning]
  cuestionarioEliminar: Cuestionario | null = null;

  mostrarModalMensaje = false;
  mensajeModal = '';

  mostrarCarga: boolean = false;

  //Permisos
  mostrarNuevo: boolean = false;  
  mostrarEditar: boolean = false;
  mostrarEliminar: boolean = false;

  
  constructor(private service: CuestionarioService, private sessionService: SessionService) {
    
  }

  ngOnInit(): void {

    //Permisos
    this.mostrarNuevo = this.sessionService.tienePermiso("cuestionario.nuevo");    
    this.mostrarEditar = this.sessionService.tienePermiso("cuestionario.editar");
    this.mostrarEliminar = this.sessionService.tienePermiso("cuestionario.eliminar");

    this.buscar();
  }



  // ============================
  // BÚSQUEDA
  // ============================
  buscar() {

    this.mostrarCarga = true;

    this.service.buscar(
      this.filtroNombre,
      this.paginaActual - 1,
      this.tamanioPagina
    ).subscribe({
      next: (r) => {
        this.mostrarCarga = false;

        this.cuestionarios.set(r.content);
        this.totalRegistros = r.totalElements;
        this.totalPaginas = r.totalPages;
        this.generarPaginas();
        this.respuestaRaw = JSON.stringify(r, null, 2);
      },
      error: (error) => {
        this.mostrarCarga = false;
        
        console.error('[Cuestionarios] Error al obtener datos', error);
        this.cuestionarios.set([]);
        this.totalRegistros = 0;
        this.totalPaginas = 0;
        this.paginas = [];
        this.respuestaRaw = JSON.stringify(
          {
            status: error.status,
            message: error.message,
            error: error.error
          },
          null,
          2
        );
      }
    });
  }

  limpiar() {
    this.filtroNombre = null;
    this.paginaActual = 1;
    this.buscar();
  }

  // ============================
  // PAGINACIÓN
  // ============================
  generarPaginas() {
    this.paginas = [];
    for (let i = 1; i <= this.totalPaginas; i++) {
      this.paginas.push(i);
    }
  }

  irPagina(p: number) {
    if (p < 1 || p > this.totalPaginas) return;
    this.paginaActual = p;
    this.buscar();
  }

  onCambioPagina() {
    this.buscar();
  }

  // ============================
  // CRUD
  // ============================
  nuevo() {
    this.seleccionado.set(null);
    this.mostrarModal.set(true);
  }

  editar(c: Cuestionario) {
    this.seleccionado.set(c);
    this.mostrarModal.set(true);
  }

  abrirEliminar(c: Cuestionario) {
    this.cuestionarioEliminar = c;
    this.mostrarModalEliminar = true;
  }

  confirmarEliminar() {
    if (!this.cuestionarioEliminar) return;

    // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-16 11:47 UTC-5 (Lima)][desc: Soporta MaterialLocalizations para es_PE/es_ES (historial por fecha)][obj: CuestionarioBandejaComponent confirmarEliminar bloquea equipo]
    if (this.cuestionarioEliminar.idEquipo) {
      this.mostrarMensaje('No se puede eliminar el cuestionario porque está asociado a un equipo de trabajo. Desasigne primero.');
      return;
    }

    this.mostrarModalEliminar = false;

    this.service.eliminar(this.cuestionarioEliminar.id!).subscribe({
      next: () => {        
        this.cuestionarioEliminar = null;
        this.mostrarMensaje("Cuestionario eliminado correctamente.");
        this.buscar();
      },
      error: (err) => {
        this.mostrarMensaje('No se pudo eliminar el cuestionario.');
      }
    });
  }

  cancelarEliminar() {
    this.mostrarModalEliminar = false;
    this.cuestionarioEliminar = null;
  }

  cerrarModal(recargar: boolean) {
    this.mostrarModal.set(false);
    // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-16 12:14 UTC-5 (Lima)][desc: Soporta MaterialLocalizations para es_PE/es_ES (historial por fecha)][obj: CuestionarioBandejaComponent recarga]
    if (recargar && this.seleccionado() === null) {
      this.paginaActual = 1;
    }
    this.seleccionado.set(null);
    if (recargar) {
      this.buscar();
    }
  }

  //Funciones para el modal de mensaje
  mostrarMensaje(mensaje: string): void {
    this.mensajeModal = mensaje;
    this.mostrarModalMensaje = true;
  }

  cerrarMensaje(): void {
    this.mostrarModalMensaje = false;
    this.mensajeModal = '';
  }

}
