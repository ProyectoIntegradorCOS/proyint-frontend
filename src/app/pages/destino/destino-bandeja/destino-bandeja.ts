import { Component, OnInit, ViewChild, ElementRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../../../services/session/session.service';
import { DestinoService, DestinoResultado } from '../../../services/destino/destino.service';
import { ImportService } from '../../../services/import/import.service';
import { MetricsService } from '../../../services/metrics/metrics.service';
import { DestinoFormComponent } from '../destino-form/destino-form';
import { ImportJobStatus } from '../../../shared/models/import-job.model';
import { ImportComponent } from '../../import/import';

@Component({
  selector: 'app-destino-bandeja',
  imports: [CommonModule, FormsModule, DestinoFormComponent, ImportComponent],
  templateUrl: './destino-bandeja.html',
  styleUrl: './destino-bandeja.css'
})
export class DestinoBandejaComponent implements OnInit {
  destinos: DestinoResultado[] = [];
 
  filtroDestino: string = '';
  filtroDireccion: string = '';  
  categoria: string = '';
  ubicabilidad: string = '';
  activo: boolean | null = true;

  columnaOrden: string = 'nombre';
  orden: string = 'ASC';

  paginaActual: number = 1;
  totalPaginas: number = 1;
  tamanioPagina: number = 10;

  mostrarModal = false;
  modoFormulario: 'registro' | 'edicion' = 'registro';
  destinoSeleccionado: any = null;

  mostrarModalConfirmaEliminacion: boolean = false;
  mostrarMensaje: boolean = false;
  mensajeTexto: string = '';
  archivoImport?: File;

  mostrarCargaXlsModal: boolean = false;
  mostrarCarga: boolean = false;

  mostrarImportComponent: boolean = false;

  mostrarModalMensajeCierre: boolean = false;
  mensajeCierreTexto: string = '';

  totalRegistros = 0;
  paginas: number[] = [];  

  mostrarModalRestaurarImport: boolean = false;
  jobPendienteRestaurar?: number;

  @ViewChild('archivoInput') archivoInputRef!: ElementRef<HTMLInputElement>;

  cargaMasivaRows: Array<{
    nombreCompleto: string;
    direccion: string;
    dep: string;
    prov: string;
    dist: string;
  }> = [];

  cargaMasivaPegado: string = '';
  jobIdActivo?: number;

  //Permisos
  mostrarNuevo: boolean = false;  
  mostrarEditar: boolean = false;
  mostrarEliminar: boolean = false;

  constructor(
    private destinoService: DestinoService,
    private metricsService: MetricsService,
    private sessionService: SessionService,
    private importService: ImportService    
  ) {}

  ngOnInit(): void {

    //Permisos
    this.mostrarNuevo = this.sessionService.tienePermiso("destinos.nuevo");    
    this.mostrarEditar = this.sessionService.tienePermiso("destinos.editar");
    this.mostrarEliminar = this.sessionService.tienePermiso("destinos.eliminar");

    this.buscar();

    // 🔥 Verificar si había importación activa
    const jobId = localStorage.getItem('importJobId');
    const activo = localStorage.getItem('importJobActivo');

    if (jobId && activo === 'true') {
      this.importService.obtenerEstado(+jobId).subscribe(status => {

        if (status.estado === 'INICIANDO' || status.estado === 'ENVIANDO ARCHIVO' || status.estado === 'PROCESANDO') {
          // 🔥 mostrar opción al usuario
          this.jobPendienteRestaurar = +jobId;
          this.mostrarModalRestaurarImport = true;

        } else {
          localStorage.removeItem('importJobId');
          localStorage.removeItem('importJobActivo');
          console.log("ngOnInit(), job-id limpiado");

        }
      });
    }
  }



  buscar(): void {
    this.mostrarCarga = true;

    this.destinoService
      .buscarDestinos(this.filtroDestino, this.filtroDireccion, this.paginaActual, this.tamanioPagina, this.orden, this.columnaOrden)
      .subscribe(resp => {

        this.mostrarCarga = false;
        this.totalRegistros = resp.totalRegistros;

        if (resp.codigoResultado === 1) {
          this.destinos = resp.resultados;
          this.paginaActual = resp.paginaActual;
          this.totalPaginas = resp.totalPaginas;  
          this.generarPaginas();        
        } else {
          this.destinos = [];
          this.totalPaginas = 1;      
          this.paginas = [];    
        }
      });
  }

  irPagina(nuevaPagina: number): void {
    if (nuevaPagina < 1 || nuevaPagina > this.totalPaginas) return;
    this.paginaActual = nuevaPagina;
    this.buscar();
  }

  onCambioPagina(): void {
    this.irPagina(this.paginaActual);
  }

  private generarPaginas(): void {
    this.paginas = Array.from(
      { length: this.totalPaginas },
      (_, i) => i + 1
    );
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

  limpiarFiltros(): void {
    this.filtroDestino = '';
    this.categoria = '';
    this.activo = true;
    this.paginaActual = 1;

    this.buscar();
  }



  descargarPlantilla(): void {
    const inicio = Date.now();
    this.destinoService.descargarPlantillaExcel().subscribe({
      next: blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla-destinos.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
        // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-23 12:01 UTC-5 (Lima)][desc: Registra métrica de descarga de plantilla de destinos][obj: DestinoBandejaComponent.descargarPlantilla]
        this.metricsService.trackEvent({
          action: 'destino_template',
          screen: 'destinos',
          status: 'success',
          durationMs: Date.now() - inicio
        });
      },
      error: err => {
        console.error('Error descargando plantilla:', err);
        this.metricsService.trackEvent({
          action: 'destino_template',
          screen: 'destinos',
          status: 'error',
          durationMs: Date.now() - inicio
        });
        this.mostrarModalMensaje('No se pudo descargar la plantilla.');
      }
    });
  }


  onArchivoSeleccionado(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      this.archivoImport = undefined;
      return;
    }
    this.archivoImport = input.files[0];
  }

  


  // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2025-12-24 16:52 UTC-5 (Lima)][desc: Exporta el catálogo de destinos filtrado a Excel][obj: DestinoBandejaComponent.exportarExcel]
  exportarExcel(): void {
    const inicio = Date.now();
    this.destinoService.exportarExcel(this.filtroDestino, this.categoria, this.activo ?? undefined).subscribe({
      next: blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'destinos.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
        // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-23 12:01 UTC-5 (Lima)][desc: Registra métrica de exportación de destinos][obj: DestinoBandejaComponent.exportarExcel]
        this.metricsService.trackEvent({
          action: 'destino_export_excel',
          screen: 'destinos',
          status: 'success',
          durationMs: Date.now() - inicio
        });
      },
      error: err => {
        console.error('Error exportando Excel:', err);
        this.metricsService.trackEvent({
          action: 'destino_export_excel',
          screen: 'destinos',
          status: 'error',
          durationMs: Date.now() - inicio
        });
        this.mostrarModalMensaje('No se pudo exportar el Excel.');
      }
    });
  }



  agregarFilaCargaMasiva(): void {
    this.cargaMasivaRows.push({ nombreCompleto: '', direccion: '', dep: '', prov: '', dist: '' });
  }

  eliminarFilaCargaMasiva(i: number): void {
    if (i < 0 || i >= this.cargaMasivaRows.length) return;
    this.cargaMasivaRows.splice(i, 1);
    if (this.cargaMasivaRows.length === 0) this.agregarFilaCargaMasiva();
  }

  pegarDesdeExcel(): void {
    const text = (this.cargaMasivaPegado || '').trim();
    if (!text) {
      this.mostrarModalMensaje('No hay texto para pegar. Copie filas desde Excel y péguelas aquí.');
      return;
    }
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) {
      this.mostrarModalMensaje('No se encontraron filas válidas en el pegado.');
      return;
    }
    for (const line of lines) {
      const cols = line.split('\t');
      const row = {
        nombreCompleto: (cols[0] || '').trim(),
        direccion: (cols[1] || '').trim(),
        dep: (cols[2] || '').trim(),
        prov: (cols[3] || '').trim(),
        dist: (cols[4] || '').trim()
      };
      const isAllBlank = !row.nombreCompleto && !row.direccion && !row.dep && !row.prov && !row.dist;
      if (!isAllBlank) this.cargaMasivaRows.push(row);
    }
    // Quitar filas vacías al inicio (para no dejar la fila placeholder si ya pegó contenido)
    // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2025-12-24 17:25 UTC-5 (Lima)][desc: Limpia fila en blanco inicial después de pegar filas desde Excel][obj: DestinoBandejaComponent.pegarDesdeExcel]
    this.cargaMasivaRows = this.cargaMasivaRows.filter(r => {
      const v = (r.nombreCompleto || '').trim() + (r.direccion || '').trim() + (r.dep || '').trim() + (r.prov || '').trim() + (r.dist || '').trim();
      return v.length > 0;
    });
    if (this.cargaMasivaRows.length === 0) this.agregarFilaCargaMasiva();
    this.cargaMasivaPegado = '';
  }



  abrirRegistro(): void {
    this.modoFormulario = 'registro';
    this.destinoSeleccionado = {
      id: null,
      codigo: '',
      nombre: '',
      categoria: '',
      direccion: null,
      latitud: null,
      longitud: null,
      referencia: null,
      zona: null,
      horarios: null,
      contacto: null,
      precision: 'APROXIMADO',
      activo: true
    };
    this.mostrarModal = true;
  }

  abrirEdicion(d: DestinoResultado): void {
    this.modoFormulario = 'edicion';
    this.destinoSeleccionado = { ...d };
    if (this.destinoSeleccionado.activo === undefined) {
      this.destinoSeleccionado.activo = true;
    }
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  onDestinoGuardado(data: any): void {

    this.mostrarModal = false;
    this.buscar();
  }

  confirmarEliminar(d: DestinoResultado): void {
    this.destinoSeleccionado = d;
    this.mostrarModalConfirmaEliminacion = true;
  }

  aceptarEliminar(): void {
    this.mostrarModalConfirmaEliminacion = false;
    this.eliminar();
  }

  cancelarEliminar(): void {
    this.mostrarModalConfirmaEliminacion = false;
  }

  eliminar(): void {
    this.destinoService.eliminarDestino(this.destinoSeleccionado.id).subscribe({
      next: resp => {
        if (resp.codigoResultado === '0') {
          this.mostrarModalMensaje('Destino eliminado correctamente.');
          this.buscar();
        } else {
          this.mostrarModalMensaje(resp.mensajeResultado);
        }
      },
      error: err => {
        console.error('Error al eliminar destino:', err);
        this.mostrarModalMensaje('Ocurrió un error al eliminar el destino.');
      }
    });
  }

  mostrarModalMensaje(texto: string): void {
    this.mensajeTexto = texto;
    this.mostrarMensaje = true;
  }

  cerrarModalMensaje(): void {
    this.mostrarMensaje = false;
  }


  mostrarModalCargaXls() {
    this.mostrarCargaXlsModal = true;    
  }

  cerrarModalCargaXls() {
    this.mostrarCargaXlsModal = false;    
  }


  
  mostrarModalCierreMensaje(texto: string): void {
    this.mensajeCierreTexto = texto;
    this.mostrarModalMensajeCierre = true;
  }

  ocultarModalMensajeCierre(): void {
    this.mostrarModalMensajeCierre = false;
    this.cerrarModalCargaXls();
  }

  limpiarArchivo(): void {
    this.archivoImport = undefined;          // Limpia la variable de archivo
    if (this.archivoInputRef) {
      this.archivoInputRef.nativeElement.value = '';  // Limpia el input HTML
    }
  }



  importarExcel(): void {

    if (!this.archivoImport) {
      this.mostrarModalMensaje('Seleccione un archivo (.xlsx) para importar.');
      return;
    }
    
    // 🔥 limpiar job anterior
    this.jobIdActivo = undefined;
    localStorage.removeItem('importJobId');
    localStorage.removeItem('importJobActivo')
    console.log("importarExcel(), job-id limpiado");
    
    this.mostrarCarga = false;
    this.mostrarCargaXlsModal = false;
    this.mostrarImportComponent = true;
  }
 

  onImportFinalizado(status: ImportJobStatus) {

    this.mostrarImportComponent = false;
    this.limpiarArchivo();

    // 🔥 limpiar estado persistido
    this.jobIdActivo = undefined;
    localStorage.removeItem('importJobId');
    localStorage.removeItem('importJobActivo');
    console.log("onImportFinalizado(), job-id limpiado");

    if (status.estado === 'COMPLETADO') {      
      this.mostrarModalCierreMensaje(
        status.mensaje || 'Importación completada correctamente.'
      );
      this.buscar();
    }

    if (status.estado === 'ERROR') {
      this.mostrarModalMensaje(
        status.mensaje || 'Ocurrió un error durante la importación.'
      );
    }
  }

  continuarImportacionPendiente() {

    if (!this.jobPendienteRestaurar) return;

    this.jobIdActivo = this.jobPendienteRestaurar;
    this.mostrarImportComponent = true;

    this.mostrarModalRestaurarImport = false;
  }

  cancelarImportacionPendiente() {

    this.jobIdActivo = undefined;
    this.jobPendienteRestaurar = undefined;

    localStorage.removeItem('importJobId');
    localStorage.removeItem('importJobActivo');

    this.mostrarModalRestaurarImport = false;

    console.log("Job antiguo cancelado y limpiado");
  }


}
