import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { lastValueFrom } from 'rxjs';
import { EquipoService } from '../../../services/equipo/equipo.service';
import { ColaboradorService } from '../../../services/colaborador/colaborador.service';
import { PlanVisitaService } from '../../../services/plan-visita/plan-visita.service';
import { MetricsService } from '../../../services/metrics/metrics.service';
import { VisitaFormComponent } from '../../../pages/visita/visita-form/visita-form';
import { SessionService } from '../../../services/session/session.service';
import { HttpErrorResponse } from '@angular/common/http';
import { VisitaMasivoComponent } from '../vista-masivo/visita-masivo';
import { EstadoPlanVisitaPipe } from '../../../pipes/EstadoPlanVisita.pipe';
import { environment } from '../../../../../src/environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';

interface EquipoSimple {
  id: number;
  nombre: string;
}

interface VisitItem {
  id?: number;
  companyName: string;
  targetTime: string;
  destinoId?: number | null;
  destinoNombre?: string | null;
  orderIndex?: number;
  state?: string;
  startTime?: string | null;
  endTime?: string | null;
  complex?: string | null;
  foundProblem?: string | null;
  problemNote?: string | null;
  otherInfo?: string | null;
}

interface VisitPlan {
  id: number;
  idUsuario: number;
  nombre: string;
  idEquipo: number;
  equipoNombre: string;
  fechaPlan: string;
  estado: string;  
  items: VisitItem[];
}

interface VisitPlanRequest {
  id: number;
  verifierId: number;               
  title: string | null;             
  plannedFor: string;               
  items: VisitItemRequest[];  
  usuarioSesion: string | null;
}

interface VisitItemRequest {
  id: number,
  companyName: string;
  targetTime: string;
  direccion?: string | null; //opcional
  destinoId?: number | null;
  prioridad?: string | null;
  plantillaPv?: string | null;
}

@Component({
  selector: 'app-visita-bandeja',
  standalone: true,
  imports: [CommonModule, FormsModule, VisitaFormComponent, VisitaMasivoComponent, EstadoPlanVisitaPipe],
  templateUrl: './visita-bandeja.html',
  styleUrls: ['./visita-bandeja.css']
})
export class VisitaBandejaComponent implements OnInit {

  // === FILTROS ===
  equipoSeleccionado = 'todos';
  personaSeleccionada = 'todos';
  fechaSeleccionada: string = this.getFechaActualFormateada();

  private filtrosBusquedaEjecutados: {
    idPersona: string | null;
    fecha: string | null;
  } | null = null;
  
  // === LISTAS ===
  listaEquipos: EquipoSimple[] = [];
  listaPersonas: any[] = [];

  // === RESULTADOS ===
  resultados: VisitPlan[] = [];

  // === PAGINACIÓN ===
  paginaActual = 1;
  totalPaginas = 1;
  tamanioPagina = 10;

  totalRegistros = 0;
  paginas: number[] = [];

  //Para el modal de nuevo y edicion
  mostrarModal = false;
  modoFormulario: 'nuevo' | 'editar' | 'lectura' = 'nuevo';
  registroSeleccionado: any = null;

  mostrarModalMensaje: boolean = false;
  mensajeModal: string = "";

  mostrarModalMasivo = false;

  mostrarProcesando : boolean = false;

  todosLosEquipos = "todos";

  //Permisos
  mostrarNuevo: boolean = false;  
  mostrarEditar: boolean = false;
  mostrarEliminar: boolean = false;  
  verTodosLosEquipos: boolean = false;  

  planSeleccionado: any = null;
  mostrarModalConfirmaEliminacion: boolean = false;

  private readonly API_URL = `${environment.api.baseUrl}`;


  constructor(
    private equipoService: EquipoService,
    private colaboradorService: ColaboradorService,
    private planVisitaService: PlanVisitaService,
    private sessionService: SessionService,
    private metricsService: MetricsService,
    private http: HttpClient
  ) {}

  async ngOnInit(): Promise<void>  {

    //Permisos
    this.mostrarNuevo = this.sessionService.tienePermiso("visitas.nuevo");    
    this.mostrarEditar = this.sessionService.tienePermiso("visitas.editar");
    this.mostrarEliminar = this.sessionService.tienePermiso("visitas.eliminar");
    this.verTodosLosEquipos = this.sessionService.tienePermiso("visitas.todoslosequipos");    

    //Esperar carga de equipos
    await this.cargarEquipos();

    //Esperar carga de personas
    await this.cargarPersonas();

    this.buscar();    
  }

  

  // Cuando tengas el backend, aquí colocarás la llamada real
  async buscar(): Promise<void> {

    const seleccionUnica = this.personaSeleccionada;    
    const todos = seleccionUnica === 'todos';
    const ids = todos ? this.listaPersonas.map(p => p.idUsuario) : [seleccionUnica];

    if (ids.length === 0 && todos) {
      this.mostrarMensajeModal('⚠️ No hay colaboradores disponibles para buscar.');
      return;
    }

    // Guardar filtros usados en esta búsqueda
    this.filtrosBusquedaEjecutados = {
      idPersona: ids.join(','),
      fecha: this.fechaSeleccionada || null
    };
  
    this.paginaActual = 1; // reset de página al buscar
  
    await this.ejecutarBusqueda();
  }

  private async ejecutarBusqueda(): Promise<void> {

    if (!this.filtrosBusquedaEjecutados) return;
  
    try {
      this.mostrarProcesando = true;

      const resp = await lastValueFrom(
        this.planVisitaService.buscarPlanes(
          this.filtrosBusquedaEjecutados.idPersona,
          this.filtrosBusquedaEjecutados.fecha,
          this.paginaActual,
          this.tamanioPagina
        )
      );
  
      this.mostrarProcesando = false;

      //console.log("resp: " + JSON.stringify(resp, null, 2));
      
      if (resp.codigoResultado === 1) {
        this.resultados = resp.resultados.map((x: any) => ({
          id: x.id,
          idUsuario: x.idUsuario,
          nombre: x.verifierNombre,
          idEquipo: x.idEquipo,
          equipoNombre: x.equipoNombre,
          fechaPlan: x.plannedFor,
          estado: x.status,
          items: x.items
        }));
      } else {
        this.resultados = [];
      }
  
      this.totalPaginas = resp.totalPaginas || 1;
      this.paginaActual = resp.paginaActual || this.paginaActual;
      this.tamanioPagina = resp.tamanioPagina || this.tamanioPagina;

      this.totalRegistros = resp.totalRegistros;
      this.generarPaginas();

  
    } catch (error) {
      console.error('Error buscando planes', error);
      this.mostrarProcesando = false;
      this.resultados = [];
    }
  }


  irPagina(n: number): void {
    if (n < 1 || n > this.totalPaginas) {
      return;
    }
    
    this.paginaActual = n;
    this.ejecutarBusqueda();
  }

  limpiarFiltros() {
    this.equipoSeleccionado = this.todosLosEquipos;
    this.personaSeleccionada = "todos";
    this.fechaSeleccionada = this.getFechaActualFormateada();
    this.paginaActual = 1;

    this.buscar();
  }

  

  //Metodos para el modal de nuevo y edicion
  nuevo() {
    this.modoFormulario = 'nuevo';
    this.registroSeleccionado = null;
    this.mostrarModal = true;
  }
  
  editar(r: any) {
    this.modoFormulario = 'editar';
    this.registroSeleccionado = r;
    this.mostrarModal = true;
  }
  
  
  cerrarModal() {
    this.mostrarModal = false;
  }
  

  async guardarDesdeModal(data: any) {

    //console.log("guardarDesdeModal(), data: " + JSON.stringify(data, null, 2));

    // Construir la lista de items para el backend
    // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2025-12-24 09:56 UTC-5 (Lima)][desc: Incluye prioridad/plantilla PV al guardar el plan][obj: VisitaBandejaComponent.guardarDesdeModal]
    const items: VisitItemRequest[] = (data.items || []).map((v: any) => ({
      id: v.id,
      companyName: v.companyName,
      direccion: v.direccion?.trim() || null,  // ← opcional
      destinoId: v.destinoId ?? null,
      prioridad: v.prioridad ?? null,
      plantillaPv: v.plantillaPv?.trim() || null,
      targetTime: v.targetTime
    }));
  
    const usuario = this.sessionService.getSession()?.usuario;
    if (!usuario) {
      throw new Error("No se pudo determinar el usuario de sesión. Imposible guardar el plan.");
    }

    const inicio = Date.now();
    const action = this.modoFormulario === 'nuevo' ? 'plan_visita_crear' : 'plan_visita_actualizar';

    try {

      //console.log("items: " + JSON.stringify(items,null,2));

      if(this.modoFormulario === 'nuevo') {
        const request: VisitPlanRequest = {
          id: 0,
          verifierId: Number(data.idPersona),
          title: null,                // si luego agregas título, reemplaza aquí
          plannedFor: data.fechaPlan, // formato YYYY-MM-DD
          items: items,               // el backend requiere lista
          usuarioSesion: usuario
        };

        const respCrea = await lastValueFrom(this.planVisitaService.createPlan(request));
        this.mostrarMensajeModal("Los datos se guardaron exitósamente.");
        // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-23 11:51 UTC-5 (Lima)][desc: Registra métricas al crear planes de visita][obj: VisitaBandejaComponent.guardarDesdeModal]
        this.metricsService.trackEvent({
          action,
          screen: 'planes_visita',
          status: 'success',
          durationMs: Date.now() - inicio
        });
        //console.log("Guardado OK:", respCrea);
      }
      else {
        const request: VisitPlanRequest = {
          id: data.idPlan,
          verifierId: Number(data.idPersona),
          title: null,                // si luego agregas título, reemplaza aquí
          plannedFor: data.fechaPlan, // formato YYYY-MM-DD
          items: items,               // el backend requiere lista
          usuarioSesion: usuario
        };

        const respActualiza = await lastValueFrom(this.planVisitaService.updatePlan(request));
        this.mostrarMensajeModal("Los datos se guardaron exitósamente.");
        this.metricsService.trackEvent({
          action,
          screen: 'planes_visita',
          status: 'success',
          durationMs: Date.now() - inicio
        });
        //console.log("Actualizado OK:", respActualiza);
      }  
      
      this.mostrarModal = false;
      this.buscar();   // recargar bandeja
   
    } catch (error) {
      //console.error("Error guardando plan:", error);
      this.metricsService.trackEvent({
        action,
        screen: 'planes_visita',
        status: 'error',
        durationMs: Date.now() - inicio
      });
      this.mostrarMensajeModal("Ocurrió un error al guardar los datos.");
    }
  }

  private getFechaActualFormateada(): string {
    const today = new Date();
    // Obtener año, mes y día
    const yyyy = today.getFullYear();
    // Se usa padStart(2, '0') para asegurar dos dígitos (ej: 09 en lugar de 9)
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // Los meses van de 0 a 11
    const dd = String(today.getDate()).padStart(2, '0');
    
    return `${yyyy}-${mm}-${dd}`;
  }
  


  mostrarMensajeModal(mensaje: string): void {
    this.mostrarModalMensaje = true;
    this.mensajeModal = mensaje;
  }

  cerrarMensajeModal(): void {
    this.mostrarModalMensaje = false;
    this.mensajeModal = "";
  }
  



  // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2025-12-24 13:35 UTC-5 (Lima)][desc: Carga masiva de planes de visita desde Excel + descarga de plantilla][obj: VisitaBandejaComponent]
  async descargarPlantillaExcel(): Promise<void> {
    const inicio = Date.now();
    try {
      const blob = await lastValueFrom(this.planVisitaService.descargarPlantillaExcel());
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla-planes-visita.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
      // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-23 12:01 UTC-5 (Lima)][desc: Registra métrica de descarga de plantilla de planes][obj: VisitaBandejaComponent.descargarPlantillaExcel]
      this.metricsService.trackEvent({
        action: 'plan_template',
        screen: 'planes_visita',
        status: 'success',
        durationMs: Date.now() - inicio
      });
    } catch (error) {
      console.error('Error descargando plantilla:', error);
      this.metricsService.trackEvent({
        action: 'plan_template',
        screen: 'planes_visita',
        status: 'error',
        durationMs: Date.now() - inicio
      });
      this.mostrarMensajeModal('No se pudo descargar la plantilla.');
    }
  }

  // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2025-12-24 16:20 UTC-5 (Lima)][desc: Exporta a Excel los planes existentes con filtros actuales][obj: VisitaBandejaComponent.exportarExcel]
  async exportarExcel(): Promise<void> {
    const inicio = Date.now();
    try {
      const blob = await lastValueFrom(
        this.planVisitaService.exportarExcel(
          this.equipoSeleccionado || null,
          this.personaSeleccionada,
          this.fechaSeleccionada || null
        )
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'planes-visita.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
      // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-23 12:01 UTC-5 (Lima)][desc: Registra métrica de exportación de planes][obj: VisitaBandejaComponent.exportarExcel]
      this.metricsService.trackEvent({
        action: 'plan_export',
        screen: 'planes_visita',
        status: 'success',
        durationMs: Date.now() - inicio
      });
    } catch (error) {
      console.error('Error exportando Excel:', error);
      this.metricsService.trackEvent({
        action: 'plan_export',
        screen: 'planes_visita',
        status: 'error',
        durationMs: Date.now() - inicio
      });
      // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2025-12-24 16:24 UTC-5 (Lima)][desc: Muestra detalle del error de export (status + mensaje backend si existe)][obj: VisitaBandejaComponent.exportarExcel]
      if (error instanceof HttpErrorResponse) {
        const status = error.status;
        if (error.error instanceof Blob) {
          const text = await error.error.text().catch(() => '');
          this.mostrarMensajeModal(`No se pudo exportar el Excel. (${status}) ${text || ''}`.trim());
          return;
        }
        this.mostrarMensajeModal(`No se pudo exportar el Excel. (${status}) ${error.message}`);
        return;
      }
      this.mostrarMensajeModal('No se pudo exportar el Excel.');
    }
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

  abrirModalMasivo() {
    this.mostrarModalMasivo = true;
  }
  
  cerrarModalMasivo() {
    this.mostrarModalMasivo = false;
    this.ejecutarBusqueda();
  }


  /* Funciones para el modal de confirmacion de eliminacion */
  confirmarEliminar(plan: VisitPlan) {
    this.planSeleccionado = plan;
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

    this.mostrarProcesando = true;

    this.planVisitaService.eliminarPlan(this.planSeleccionado.id).subscribe({
      next: (resp) => {
  
        this.mostrarProcesando = false;

        if (resp.codigoResultado === "0") {
          this.mostrarMensajeModal("Plan eliminado correctamente.");
  
          // 🔄 Recargar nuevamente la lista
          this.buscar();
  
        } else {          
          //No se pudo eliminar el plan, mostrar el mensaje devuelto.
          this.mostrarMensajeModal(resp.mensajeResultado);
        }
      },
      error: (err) => {
        console.error("Error al eliminar plan:", err);
        this.mostrarProcesando = false;
        this.mostrarMensajeModal("Ocurrió un error al eliminar el plan.");
      }
    });
    
  }


  onEquipoChange() {

    const session = this.sessionService.getSession();    

    if (this.equipoSeleccionado === "todos") {
        this.cargarPersonas();      
    }
    else {
        this.cargarPersonasEquipo(this.equipoSeleccionado);
    }
  }
  
  async cargarEquipos(): Promise<void> {

    const session = this.sessionService.getSession();

    if(this.verTodosLosEquipos) {
      await this.cargarEquiposTodos();
    }
    else {
      //Este bloque es valido cuando se desea filtrar los equipos y las personas que son supervisadas por el usuario de la sesion.
      //console.log("session: " + JSON.stringify(session, null, 2));

      if (session?.idUsuario) {      
        await this.cargarEquiposUsuario(session.idUsuaSist);
      }
      else {
        this.mostrarMensajeModal('⚠️ No se pudo obtener la sesión del usuario.');
      }
    }
  }

  async cargarEquiposTodos(): Promise<void> {

    this.mostrarProcesando = true;

    try {
      const data: any = await lastValueFrom(this.equipoService.listarActivos());
      this.listaEquipos = data.resultados || [];

      this.mostrarProcesando = false;
      //console.log('Equipos:', data.resultados);

    } catch (error) {
      this.mostrarProcesando = false;
      console.error('Error cargando todos los equipos', error);
      this.listaEquipos = [];
    }
  }

  async cargarEquiposUsuario(idUsuario: string | number): Promise<void> {

    this.mostrarProcesando = true;
    try {
      const data: any = await lastValueFrom(this.equipoService.listarSupervisadosPorusuario(idUsuario));
      this.listaEquipos = data.resultados || [];

      this.mostrarProcesando = false;
      //console.log('Equipos:', data.resultados);

    } catch (error) {
      this.mostrarProcesando = false;
      console.error('Error cargando equipos', error);
      this.listaEquipos = [];
    }
  }
  


  async cargarPersonas(): Promise<void> {

    const session = this.sessionService.getSession();

    if(this.verTodosLosEquipos) {
      await this.cargarPersonasCampoTodas();
    }
    else {
      //Este bloque es valido cuando se desea filtrar las personas que son supervisadas por el usuario de la sesion.
      if (session?.idUsuario) {      
        await this.cargarPersonasUsuario(session.idUsuaSist);
      }
      else {
        this.mostrarMensajeModal('⚠️ No se pudo obtener la sesión del usuario.');
      }
    }
  }
 
  async cargarPersonasCampoTodas(): Promise<void> {
    this.mostrarProcesando = true;

    try {
      const response = await lastValueFrom(
        this.http.get<any>(`${this.API_URL}/api/users/personas/campo`)        
      );
  
      // El backend devuelve: { codigoResultado, mensajeResultado, resultados: [...] }
      if (response && Array.isArray(response.resultados)) {
        this.listaPersonas = response.resultados.map((p: any) => ({
          idUsuario: p.id.toString(),
          usuario: p.nombre
        }));

        //Selecciona el primer elemento de la lista
        this.personaSeleccionada = "todos";
      } else {
        this.listaPersonas = [];
        this.mostrarMensajeModal('⚠️ No se encontraron personas disponibles.');
      }
    } catch (error) {
      console.error('Error al cargar personas:', error);
      this.mostrarMensajeModal('⚠️ No se pudo cargar la lista de personas.');
    } finally {
      this.mostrarProcesando = false;
    }
  }

  async cargarPersonasUsuario(idUsuario: string | number): Promise<void> {
    this.mostrarProcesando = true;
    
    try {
      const params = new HttpParams()
        .set('idSupervisor', idUsuario.toString());

      const response = await lastValueFrom(
        this.http.get<any>(`${this.API_URL}/api/users/supervisados`, { params })
      );
  
      // El backend devuelve: { codigoResultado, mensajeResultado, resultados: [...] }
      if (response && Array.isArray(response.resultados)) {
        this.listaPersonas = response.resultados.map((p: any) => ({
          idUsuario: p.id.toString(),
          usuario: p.nombre
        }));

        //Selecciona el primer elemento de la lista
        this.personaSeleccionada = "todos";
      } else {
        this.listaPersonas = [];
        this.mostrarMensajeModal('⚠️ No se encontraron personas disponibles.');
      }
    } catch (error) {
      console.error('Error al cargar personas:', error);
      this.mostrarMensajeModal('⚠️ No se pudo cargar la lista de personas.');
    } finally {
      this.mostrarProcesando = false;
    }
  }

  async cargarPersonasEquipo(idEquipo: string | number): Promise<void> {
    this.mostrarProcesando = true;
    try {
      const response = await lastValueFrom(
        this.http.get<any>(`${this.API_URL}/api/users/personas/equipo?idEquipo=${idEquipo}`)
      );
  
      // El backend devuelve: { codigoResultado, mensajeResultado, resultados: [...] }
      if (response && Array.isArray(response.resultados)) {
        this.listaPersonas = response.resultados.map((p: any) => ({
          idUsuario: p.id.toString(),
          usuario: p.nombre
        }));

        //Selecciona el primer elemento de la lista
        this.personaSeleccionada = "todos";
      } else {
        this.listaPersonas = [];
        this.mostrarMensajeModal('⚠️ No se encontraron personas disponibles.');
      }
    } catch (error) {
      console.error('Error al cargar personas:', error);
      this.mostrarMensajeModal('⚠️ No se pudo cargar la lista de personas.');
    } finally {
      this.mostrarProcesando = false;
    }
  }


  /* Devuelve true si la fecha es mayor o igual a la fecha actual */
  esFechaPlanValida(fecha: string): boolean {
    if (!fecha) return false;

    // Fecha seleccionada (YYYY-MM-DD)
    const fechaPlan = new Date(fecha + 'T00:00:00');
  
    // Fecha actual sin hora
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
  
    return fechaPlan >= hoy;
  }



}
