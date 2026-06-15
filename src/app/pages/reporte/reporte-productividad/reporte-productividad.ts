import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import Chart from 'chart.js/auto';
import { lastValueFrom } from 'rxjs';
import { ReporteService, ReporteProductividad } from '../../../services/reporte/reporte.service';
import { EquipoService } from '../../../services/equipo/equipo.service';
import { ColaboradorService } from '../../../services/colaborador/colaborador.service';
import { VisitaFormComponent } from '../../../pages/visita/visita-form/visita-form';
import { PlanVisitaService } from '../../../services/plan-visita/plan-visita.service';
import { EstadoPlanVisitaPipe } from '../../../pipes/EstadoPlanVisita.pipe';
import { SessionService } from '../../../services/session/session.service';
import { environment } from '../../../../../src/environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';

@Component({
  selector: 'app-reporte-productividad',
  standalone: true,
  imports: [CommonModule, FormsModule, VisitaFormComponent, EstadoPlanVisitaPipe],
  templateUrl: './reporte-productividad.html',
  styleUrls: ['./reporte-productividad.css']
})

export class ReporteProductividadComponent implements OnInit {

  private reporteService = inject(ReporteService);
  private equipoService = inject(EquipoService);
  private colaboradorService = inject(ColaboradorService);

  listaEquipos: any[] = [];
  listaPersonas: any[] = [];
  reporte: ReporteProductividad[] = [];

  equipoSeleccionado = 'todos';
  personaSeleccionada = 'todos';
  todosLosEquipos = "todos";
  fechaInicioSeleccionada: string = '';
  fechaFinSeleccionada: string = '';
  fechaActual: string = '';

  chart: any;
  mostrarMensaje: boolean = false;
  mensajeTexto: string = "";
  mostrarCarga: boolean = false;

  /* Para ver del detalle del plan */
  mostrarModal = false;
  modoFormulario: 'lectura' = 'lectura';
  planSeleccionado: any = null;

  vistaActiva: 'tabla' | 'grafico' = 'tabla';

  private readonly API_URL = `${environment.api.baseUrl}`;

  //Permisos
  verTodosLosEquipos: boolean = false;


  constructor(private cdr: ChangeDetectorRef, 
              private visitPlanService: PlanVisitaService, 
              private sessionService: SessionService,
              private http: HttpClient) {}

  async ngOnInit(): Promise<void>  {
    const hoy = new Date();
    this.fechaActual = hoy.toISOString().substring(0, 10);
    this.fechaInicioSeleccionada = this.fechaActual;
    this.fechaFinSeleccionada = this.fechaActual;    

    this.verTodosLosEquipos = this.sessionService.tienePermiso("reportes.todoslosequipos");    

    //Esperar carga de equipos
    await this.cargarEquipos();
    
    //Esperar carga de personas
    await this.cargarPersonas();

    this.generarReporte();
  }

  

  // ============================================================
  // GENERAR REPORTE REAL
  // ============================================================

  generarReporte() {
    
    //Validaciones
    if (this.fechaInicioSeleccionada && this.fechaFinSeleccionada) {
      const fechaInicio = new Date(this.fechaInicioSeleccionada);
      const fechaFin = new Date(this.fechaFinSeleccionada);

      if (fechaInicio > fechaFin) {
        this.mostrarModalMensaje(
          'La fecha de inicio no puede ser mayor que la fecha fin.'
        );
        return;
      }
    }

    //Limpieza
    this.ocultarModalMensaje();
    
    //Obtener los IDs de las personas
    const seleccionUnica = this.personaSeleccionada;    
    const todos = seleccionUnica === 'todos';
    const ids = todos ? this.listaPersonas.map(p => p.idUsuario) : [seleccionUnica];

    if (ids.length === 0 && todos) {
      this.mostrarModalMensaje('⚠️ No hay colaboradores disponibles para buscar.');
      return;
    }

    //Procesamiento
    this.mostrarCarga = true;
    this.reporteService.obtenerReporteProductividad(ids.join(','),this.fechaInicioSeleccionada, this.fechaFinSeleccionada)
      .subscribe({
        next: (data) => {
          this.mostrarCarga = false;
          //console.log("📌 Datos recibidos:", data);
          this.reporte = data;

          // Actualizamos DOM para que el canvas exista antes de dibujar
          this.cdr.detectChanges();

          if (this.reporte.length > 0) {
            //Si estamos en la pestaña del grafico entonces volver a dibujar los nuevos datos.
            if (this.vistaActiva === 'grafico') {
              setTimeout(() => this.generarGrafico(), 0);
            }
          } 
          else {
            this.mostrarModalMensaje("No se encontraron datos.");
            this.limpiarGrafico();            
          }

          //console.log("Datos: " + JSON.stringify(data,null,2));
        },
        error: (err) => {
          this.mostrarCarga = false;
          console.error("❌ Error al obtener reporte:", err);
          this.mostrarModalMensaje("Ocurrió un error al obtener el reporte.");
          this.reporte = [];          
          this.limpiarGrafico();
        }
      });
  }

  mostrarModalMensaje(texto: string) {
    this.mensajeTexto = texto;
    this.mostrarMensaje = true;
  }

  ocultarModalMensaje() {
    this.mensajeTexto = "";
    this.mostrarMensaje = false;
  }

  cerrarModalMensaje() {
    this.mostrarMensaje = false;
  }

  // ============================================================
  // GRAFICO
  // ============================================================

  generarGrafico() {
    const canvas = document.getElementById('graficoBarra') as HTMLCanvasElement;

    if (!canvas) {
      console.error("❌ Canvas no encontrado, reintentando...");
      setTimeout(() => this.generarGrafico(), 50);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error("❌ No se pudo obtener el contexto 2D");
      return;
    }

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.reporte.map(r => {
                                        const [anio, mes, dia] = r.fechaPlan.split('-');
                                        const fecha = `${dia}/${mes}/${anio}`;
                                        const nombre = this.formatearNombreGrafico(r.nombreVerifier);
                                        return `${nombre} - ${fecha}`;
                                      }),
        datasets: [
          {
            label: 'Planificadas',
            data: this.reporte.map(r => r.totalVisitas)
          },
          {
            label: 'Completadas',
            data: this.reporte.map(r => r.completadas)
          },
          {
            label: 'Terminadas',
            data: this.reporte.map(r => r.terminadas)
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0   // 🔑 evita decimales
            }
          }
        }
      }
    });
  }

  formatearNombreGrafico(nombreCompleto: string): string {
    const partes = nombreCompleto.trim().split(/\s+/);
    
    if (partes.length >= 4) {
      return `${partes[0]} ${partes[2]}`; // primer nombre + primer apellido
    } else if (partes.length === 3) {
      return `${partes[0]} ${partes[1]}`; // primer nombre + segundo nombre o primer apellido
    } else {
      return nombreCompleto; // menos de 3 palabras, tal cual
    }
  }


  limpiarGrafico() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  /* Para ver del detalle del plan */
  cerrarModal() {
    this.mostrarModal = false;
  }

  verPlan(planId: number): void {
    this.visitPlanService.getPlan(planId).subscribe({
      next: (resp) => {
        
        //console.log("resp= " + JSON.stringify(resp,null,2));

        //Inicializar primero
        this.planSeleccionado = {
          id: null,
          idUsuario: null,
          nombre: null,
          idEquipo: null,
          equipoNombre: null,
          fechaPlan: null,
          estado: null,
          items: []
        };

        //Mapeo de valores
        this.planSeleccionado.id = resp.id;
        this.planSeleccionado.idUsuario = resp.verifierId;
        this.planSeleccionado.nombre = resp.verifierNombre;
        this.planSeleccionado.idEquipo = resp.idEquipo;
        this.planSeleccionado.equipoNombre = resp.equipoNombre;
        this.planSeleccionado.fechaPlan = resp.plannedFor;
        this.planSeleccionado.estado = resp.status;
        this.planSeleccionado.items = resp.items;        

        //Modal
        this.mostrarModal = true;
      },
      error: (err) => {
        console.error('Error al obtener plan de visitas', err);
      }
    });
  }

  guardarDesdeModal(evento: any) {
    this.cerrarModal();
  }

  cambiarVista(vista: 'tabla' | 'grafico') {
      this.vistaActiva = vista;

      if (vista === 'grafico') {
          setTimeout(() => {
              this.generarGrafico(); // tu método actual de Chart.js
          }, 0);
      }
  }


  //-------------------------------------------------------
  //Funciones para cargar los equipos y personas
  //-------------------------------------------------------
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
        this.mostrarModalMensaje('⚠️ No se pudo obtener la sesión del usuario.');
      }
    }
  }

  async cargarEquiposTodos(): Promise<void> {

    this.mostrarCarga = true;

    try {
      const data: any = await lastValueFrom(this.equipoService.listarActivos());
      this.listaEquipos = data.resultados || [];

      this.mostrarCarga = false;
      //console.log('Equipos:', data.resultados);

    } catch (error) {
      this.mostrarCarga = false;
      console.error('Error cargando todos los equipos', error);
      this.listaEquipos = [];
    }
  }

  async cargarEquiposUsuario(idUsuario: string | number): Promise<void> {

    this.mostrarCarga = true;
    try {
      const data: any = await lastValueFrom(this.equipoService.listarSupervisadosPorusuario(idUsuario));
      this.listaEquipos = data.resultados || [];

      this.mostrarCarga = false;
      //console.log('Equipos:', data.resultados);

    } catch (error) {
      this.mostrarCarga = false;
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
        this.mostrarModalMensaje('⚠️ No se pudo obtener la sesión del usuario.');
      }
    }
  }
 
  async cargarPersonasCampoTodas(): Promise<void> {
    this.mostrarCarga = true;

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
        this.mostrarModalMensaje('⚠️ No se encontraron personas disponibles.');
      }
    } catch (error) {
      console.error('Error al cargar personas:', error);
      this.mostrarModalMensaje('⚠️ No se pudo cargar la lista de personas.');
    } finally {
      this.mostrarCarga = false;
    }
  }

  async cargarPersonasUsuario(idUsuario: string | number): Promise<void> {
    this.mostrarCarga = true;
    
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
        this.mostrarModalMensaje('⚠️ No se encontraron personas disponibles.');
      }
    } catch (error) {
      console.error('Error al cargar personas:', error);
      this.mostrarModalMensaje('⚠️ No se pudo cargar la lista de personas.');
    } finally {
      this.mostrarCarga = false;
    }
  }

  async cargarPersonasEquipo(idEquipo: string | number): Promise<void> {
    this.mostrarCarga = true;
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
        this.mostrarModalMensaje('⚠️ No se encontraron personas disponibles.');
      }
    } catch (error) {
      console.error('Error al cargar personas:', error);
      this.mostrarModalMensaje('⚠️ No se pudo cargar la lista de personas.');
    } finally {
      this.mostrarCarga = false;
    }
  }



}
