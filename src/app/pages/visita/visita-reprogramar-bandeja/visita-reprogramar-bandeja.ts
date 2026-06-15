import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { lastValueFrom } from 'rxjs';
import { EquipoService } from '../../../services/equipo/equipo.service';
import { ColaboradorService } from '../../../services/colaborador/colaborador.service';
import { PlanVisitaService } from '../../../services/plan-visita/plan-visita.service';
import { SessionService } from '../../../services/session/session.service';
import { VisitItemPendingReprogramResponse, VisitItemReassignRequest } from '../../../shared/models/visit-item-reprogram.model';
import { MetricsService } from '../../../services/metrics/metrics.service';
import { EstadoItemPlanVisitaPipe } from '../../../pipes/EstadoItemPlanVisita.pipe';
import { PrioridadItemPlanPipe } from '../../../pipes/prioridad-item-plan.pipe';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../../src/environments/environment';

interface EquipoSimple {
  id: number;
  nombre: string;
}

interface PersonaSimple {
  id: number;
  nombre: string;
}

// [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-21 15:01 UTC-5 (Lima)][desc: Bandeja web para pendientes de reprogramar][obj: VisitaReprogramarBandejaComponent]
@Component({
  selector: 'app-visita-reprogramar-bandeja',
  standalone: true,
  imports: [CommonModule, FormsModule, EstadoItemPlanVisitaPipe, PrioridadItemPlanPipe],
  templateUrl: './visita-reprogramar-bandeja.html',
  styleUrls: ['./visita-reprogramar-bandeja.css']
})
export class VisitaReprogramarBandejaComponent implements OnInit {

  equipoSeleccionado = 'todos';
  personaSeleccionada = 'todos';
  fechaSeleccionada = '';

  minFechaReprogramacion = '';

  private filtrosBusquedaEjecutados: {
    idEquipo: string | null;
    idPersona: string | null;
    fecha: string | null;
  } | null = null;

  listaEquipos: EquipoSimple[] = [];
  listaPersonas: any[] = [];
  listaPersonasReasignar: PersonaSimple[] = [];

  resultados: VisitItemPendingReprogramResponse[] = [];

  paginaActual = 1;
  totalPaginas = 1;
  tamanioPagina = 10;
  totalRegistros = 0;
  paginas: number[] = [];

  mostrarProcesando = false;
  mostrarModalReprogramar = false;
  mostrarModalMensaje = false;
  mensajeModal = '';
  mostrarBotonCrearPlan = false;

  mostrarModalConfirmacion: boolean = false;

  registroSeleccionado: VisitItemPendingReprogramResponse | null = null;

  reassignForm: VisitItemReassignRequest = {
    newVerifierId: 0,
    newPlannedFor: '',
    reason: ''
  };

  //Permisos
  mostrarReprogramar: boolean = false;
  verTodosLosEquipos: boolean = false;

  private readonly API_URL = `${environment.api.baseUrl}`;

  idsPersonasInicialTotal: string = '';

  
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
    this.mostrarReprogramar = this.sessionService.tienePermiso("reprogramar.visitas");
    this.verTodosLosEquipos = this.sessionService.tienePermiso("reprogramar.todoslosequipos");
    
    this.minFechaReprogramacion = this.getFechaActualFormateada();
    
    //Esperar carga de equipos
    await this.cargarEquipos();

    //Esperar carga de personas
    await this.cargarPersonas();

    //Guardar la lista total inicial de las personas que el usuario de la sesion puede ver, para luego usar en el modal de reasignacion.
    const idsInicialTotal = this.listaPersonas.map(p => p.idUsuario);
    this.idsPersonasInicialTotal = idsInicialTotal.join(',');

    //Finalmente, ejecutar la busqueda
    this.buscar();
  }

  

  async buscar(): Promise<void> {

    const seleccionUnica = this.personaSeleccionada;    
    const todos = seleccionUnica === 'todos';
    const ids = todos ? this.listaPersonas.map(p => p.idUsuario) : [seleccionUnica];

    if (ids.length === 0 && todos) {
      this.mostrarMensaje('⚠️ No hay colaboradores disponibles para buscar.');
      return;
    }

    // Guardar filtros usados en esta búsqueda
    this.filtrosBusquedaEjecutados = {
      idEquipo: this.equipoSeleccionado || null,
      idPersona: ids.join(','),
      fecha: this.fechaSeleccionada || null
    };

    this.paginaActual = 1;
    await this.ejecutarBusqueda();
  }

  private async ejecutarBusqueda(): Promise<void> {
    if (!this.filtrosBusquedaEjecutados) return;

    try {
      this.mostrarProcesando = true;
      // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-21 16:44 UTC-5 (Lima)][desc: Envia idSupervisor desde sesion para reprogramacion][obj: VisitaReprogramarBandejaComponent.ejecutarBusqueda]
      const session = this.sessionService.getSession();
      const resp = await lastValueFrom(
        this.planVisitaService.buscarPendientesReprogramar(
          this.filtrosBusquedaEjecutados.idPersona,
          this.filtrosBusquedaEjecutados.fecha,
          this.paginaActual,
          this.tamanioPagina
        )
      ); 

      this.mostrarProcesando = false;

      //console.log("resp: " + JSON.stringify(resp, null, 2));


      if (resp.codigoResultado === 1 || resp.codigoResultado === '1') {
        this.resultados = resp.resultados || [];
      } else {
        this.resultados = [];
      }

      this.totalPaginas = resp.totalPaginas || 1;
      this.paginaActual = resp.paginaActual || this.paginaActual;
      this.tamanioPagina = resp.tamanioPagina || this.tamanioPagina;
      this.totalRegistros = resp.totalRegistros || 0;
      this.generarPaginas();
    } catch (error) {
      console.error('Error buscando pendientes', error);
      this.mostrarProcesando = false;
      this.resultados = [];
      this.totalRegistros = 0;
      this.generarPaginas();
    }
  }

  limpiarFiltros(): void {
    this.equipoSeleccionado = '';
    this.personaSeleccionada = 'todos';
    this.fechaSeleccionada = '';
    this.paginaActual = 1;
    
    this.buscar();
  }

  abrirReprogramar(item: VisitItemPendingReprogramResponse): void {

    this.registroSeleccionado = item;
    this.reassignForm = {
      newVerifierId: 0,
      newPlannedFor: '',
      reason: ''
    };
    
    this.cargarVerificadoresPorFecha();
    this.mostrarModalReprogramar = true;
  }

  cerrarModalReprogramar(): void {
    this.mostrarModalReprogramar = false;
    this.registroSeleccionado = null;
    this.mostrarBotonCrearPlan = false;
  }

  validarReprogramacion() {
    if (!this.registroSeleccionado) {
      return;
    }

    if (!this.reassignForm.newPlannedFor) {
      this.mostrarMensaje('Seleccione la fecha.');
      return;
    }

    if (!this.reassignForm.newVerifierId) {
      this.mostrarMensaje('Seleccione un colaborador.');
      return;
    }

    this.confirmarGuardar();
  }

  async confirmarReprogramacion(): Promise<void> {
    if (!this.registroSeleccionado) {
      return;
    }

    const inicio = Date.now();
    try {
      this.mostrarProcesando = true;
      const response = await lastValueFrom(
        this.planVisitaService.reprogramarPendiente(
          this.registroSeleccionado.itemId,
          this.reassignForm
        )
      );

      this.mostrarProcesando = false;

      // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-21 15:01 UTC-5 (Lima)][desc: Normaliza comparacion de codigoResultado como string][obj: VisitaReprogramarBandejaComponent.confirmarReprogramacion]
      if (String(response.codigoResultado) === '2') {
        this.mostrarMensaje('Visita reprogramada correctamente.');
        // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-23 12:01 UTC-5 (Lima)][desc: Registra métrica de reprogramación de visitas][obj: VisitaReprogramarBandejaComponent.confirmarReprogramacion]
        this.metricsService.trackEvent({
          action: 'visita_reprogramar',
          screen: 'reprogramacion',
          status: 'success',
          durationMs: Date.now() - inicio
        });
        this.cerrarModalReprogramar();
        await this.ejecutarBusqueda();
      } else {
        this.metricsService.trackEvent({
          action: 'visita_reprogramar',
          screen: 'reprogramacion',
          status: 'error',
          durationMs: Date.now() - inicio
        });
        this.mostrarMensaje(response.mensajeResultado || 'No se pudo reprogramar.');
      }
    } catch (error) {
      console.error('Error reprogramando visita', error);
      this.mostrarProcesando = false;
      this.metricsService.trackEvent({
        action: 'visita_reprogramar',
        screen: 'reprogramacion',
        status: 'error',
        durationMs: Date.now() - inicio
      });
      this.mostrarMensaje('Error al reprogramar la visita.');
    }
  }

  async cargarVerificadoresPorFecha(): Promise<void> {
    if (!this.reassignForm.newPlannedFor) {
      this.listaPersonasReasignar = [];
      this.mostrarBotonCrearPlan = true;
      return;
    }

    try {
      this.mostrarProcesando = true;

      // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-22 08:13 UTC-5 (Lima)][desc: Lista verificadores con plan segun fecha][obj: VisitaReprogramarBandejaComponent.cargarVerificadoresPorFecha]
      const response: any = await lastValueFrom(
        this.planVisitaService.listarVerificadoresConPlan(
          this.reassignForm.newPlannedFor,
          this.idsPersonasInicialTotal
        )
      );

      const resultados = response?.resultados || [];
      this.listaPersonasReasignar = resultados.map((p: any) => ({
        id: Number(p.id),
        nombre: p.nombre
      }));

      this.mostrarBotonCrearPlan = this.listaPersonasReasignar.length === 0;

      if(this.listaPersonasReasignar.length === 0) {
        this.mostrarMensaje("No se encontró ningún colaborador que tenga un \n plan de visita no completado para la fecha seleccionada.");
      }
    } catch (error) {
      console.error('Error cargando verificadores por fecha', error);
      this.listaPersonasReasignar = [];
      this.mostrarBotonCrearPlan = true;
    } finally {
      this.mostrarProcesando = false;
    }
  }

  abrirCrearPlan(): void {
    window.location.href = '/web.visitas';
  }

  mostrarMensaje(mensaje: string): void {
    this.mensajeModal = mensaje;
    this.mostrarModalMensaje = true;
  }

  cerrarMensaje(): void {
    this.mostrarModalMensaje = false;
    this.mensajeModal = '';
  }

  irPagina(n: number): void {
    if (n < 1 || n > this.totalPaginas) {
      return;
    }

    this.paginaActual = n;
    this.ejecutarBusqueda();
  }

  onCambioPagina(): void {
    this.irPagina(this.paginaActual);
  }

  generarPaginas(): void {
    this.paginas = Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
  }

  private getFechaActualFormateada(): string {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  /* Funciones para el modal de confirmacion */
  confirmarGuardar() {
    this.mostrarModalConfirmacion = true;      
  }

  aceptarGuardar() {
    this.mostrarModalConfirmacion = false;   
    this.confirmarReprogramacion(); 
  }
  
  cancelarGuardar() {
    this.mostrarModalConfirmacion = false;    
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
        this.mostrarMensaje('⚠️ No se pudo obtener la sesión del usuario.');
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
        this.mostrarMensaje('⚠️ No se pudo obtener la sesión del usuario.');
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
        this.mostrarMensaje('⚠️ No se encontraron personas disponibles.');
      }
    } catch (error) {
      console.error('Error al cargar personas:', error);
      this.mostrarMensaje('⚠️ No se pudo cargar la lista de personas.');
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
        this.mostrarMensaje('⚠️ No se encontraron personas disponibles.');
      }
    } catch (error) {
      console.error('Error al cargar personas:', error);
      this.mostrarMensaje('⚠️ No se pudo cargar la lista de personas.');
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
        this.mostrarMensaje('⚠️ No se encontraron personas disponibles.');
      }
    } catch (error) {
      console.error('Error al cargar personas:', error);
      this.mostrarMensaje('⚠️ No se pudo cargar la lista de personas.');
    } finally {
      this.mostrarProcesando = false;
    }
  }

}  
  
