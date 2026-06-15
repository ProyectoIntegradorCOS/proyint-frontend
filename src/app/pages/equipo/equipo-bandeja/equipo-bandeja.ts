import { Component, OnInit } from '@angular/core';
import { EquipoService, EquipoResultado } from '../../../services/equipo/equipo.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EquipoFormComponent } from '../equipo-form/equipo-form';
import { SessionService } from '../../../services/session/session.service';

@Component({
  selector: 'app-equipo-bandeja',
  imports: [CommonModule, FormsModule, EquipoFormComponent],
  templateUrl: './equipo-bandeja.html',
  styleUrl: './equipo-bandeja.css'
})
export class BandejaEquipoComponent implements OnInit {

  equipos: EquipoResultado[] = [];

  // Filtros
  nombreEquipo: string = '';
  nombreSupervisor: string = '';

  //Filtros guardados
  nombreFiltroEquipo: string = '';
  nombreFiltroSupervisor: string = '';

  // Orden
  columnaOrden: string = '';
  orden: string = ''; // ASC / DESC

  // Paginación
  paginaActual: number = 1;
  totalPaginas: number = 1;
  tamanioPagina: number = 10;

  totalRegistros = 0;

  paginas: number[] = [];

  mostrarModal = false;
  modoFormulario: 'registro' | 'edicion' = 'registro';
  equipoSeleccionado: any = null;

  mostrarModalConfirmaEliminacion: boolean = false;
  mostrarMensaje: boolean = false;
  mensajeTexto: string = "";

  mostrarCarga: boolean = false;

  //Permisos
  mostrarNuevo: boolean = false;  
  mostrarEditar: boolean = false;
  mostrarEliminar: boolean = false;

  constructor(private equipoService: EquipoService, private  sessionService: SessionService) {}

  ngOnInit(): void {
    this.buscar();

    this.mostrarNuevo = this.sessionService.tienePermiso("equipos.nuevo");    
    this.mostrarEditar = this.sessionService.tienePermiso("equipos.editar");
    this.mostrarEliminar = this.sessionService.tienePermiso("equipos.eliminar");
  }

  realizarBusqueda() {
    //Reinicia la paginacion
    this.paginaActual = 1;
    
    //Guarda los filtros usados
    this.nombreFiltroEquipo = this.nombreEquipo;
    this.nombreFiltroSupervisor = this.nombreSupervisor;

    this.buscar();
  }

  buscar(): void {
    this.mostrarCarga = true;

    this.equipoService.buscarEquipos(
      this.nombreFiltroEquipo,
      this.nombreFiltroSupervisor,
      this.paginaActual,
      this.tamanioPagina,
      this.orden,
      this.columnaOrden
    ).subscribe(resp => {
      this.mostrarCarga = false;
      
      this.totalRegistros = resp.totalRegistros;
      
      if (resp.codigoResultado === 1) {
        this.equipos = resp.resultados;
        this.paginaActual = resp.paginaActual;
        this.totalPaginas = resp.totalPaginas;
        this.totalRegistros = resp.totalRegistros;

        this.generarPaginas();

        //console.log("this.equipos: " + JSON.stringify(this.equipos, null, 2));

      } else {
        this.equipos = [];        
      }
    });

    
  }

  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina < 1 || nuevaPagina > this.totalPaginas) return;
    this.paginaActual = nuevaPagina;
    this.buscar();
  }

  ordenarPor(columna: string): void {
    if (this.columnaOrden === columna) {
      this.orden = this.orden === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.columnaOrden = columna;
      this.orden = 'ASC';
    }
    this.buscar();
  }

  limpiarFiltros() {
    this.nombreEquipo = '';
    this.nombreSupervisor = '';
    this.paginaActual = 1;

    this.realizarBusqueda();
  }



  /* Funciones para el modal de registro y edicion */
  abrirRegistro() {
    this.mostrarCarga = true;
    this.modoFormulario = 'registro';
    this.equipoSeleccionado = { id: 0, nombre: '', supervisorId: null, supervisorNombre: '' };
    this.mostrarModal = true;
    this.mostrarCarga = false;
  }
  
  abrirEdicion(eq: EquipoResultado) {
    this.mostrarCarga = true;
    this.modoFormulario = 'edicion';
    this.equipoSeleccionado = { ...eq };
    this.mostrarModal = true;
    this.mostrarCarga = false;
  }

  cerrarModal() {
    this.mostrarModal = false;
  }
  
  onGuardado() {
    this.mostrarModal = false;
    this.buscar(); // refrescar bandeja
  }



  /* Funciones para el modal de confirmacion de eliminacion */
  confirmarEliminar(eq: EquipoResultado) {
    this.equipoSeleccionado = eq;
    this.mostrarModalConfirmaEliminacion = true;
  }

  aceptarEliminar() {
    this.mostrarModalConfirmaEliminacion = false;
    this.eliminar();
  }
  
  cancelarEliminar() {
    this.mostrarModalConfirmaEliminacion = false;
  }

  eliminar() {

    this.mostrarCarga = true;

    this.equipoService.eliminarEquipo(this.equipoSeleccionado.id).subscribe({
      next: (resp) => {
  
        this.mostrarCarga = false;

        if (resp.codigoResultado === "0") {
          this.mostrarModalMensaje("Equipo eliminado correctamente.");
  
          // 🔄 Recargar nuevamente la lista
          this.buscar();
  
        } else {          
          //No se pudo eliminar el equipo, mostrar el mensaje devuelto.
          this.mostrarModalMensaje(resp.mensajeResultado);
        }
      },
      error: (err) => {
        this.mostrarCarga = false;
        console.error("Error al eliminar equipo:", err);
        this.mostrarModalMensaje("Ocurrió un error al eliminar el equipo.");
      }
    });
  }


  /* Funciones para el modal de mensaje */
  mostrarModalMensaje(texto: string) {
    this.mensajeTexto = texto;
    this.mostrarMensaje = true;
  }

  cerrarModalMensaje() {
    this.mostrarMensaje = false;
  }


  private generarPaginas(): void {
    this.paginas = Array.from(
      { length: this.totalPaginas },
      (_, i) => i + 1
    );
  }

  onCambioPagina(): void {
    this.cambiarPagina(this.paginaActual);
  }

}
