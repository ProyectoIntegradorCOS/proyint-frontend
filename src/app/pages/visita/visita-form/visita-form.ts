import { Component, EventEmitter, Input, Output, inject, DestroyRef,
  ViewChild, ViewChildren, ElementRef, QueryList, AfterViewInit  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../../../services/session/session.service';
import { PlanVisitaService } from '../../../services/plan-visita/plan-visita.service';
import { DestinoService, DestinoResultado} from '../../../services/destino/destino.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestinoFormComponent } from '../../destino/destino-form/destino-form';
import { DestinoSelectorComponent } from '../../destino/destino-selector/destino-selector';
import { CuestionarioService } from '../../../services/cuestionario/cuestionario.service';
import { RespuestaService } from '../../../services/respuesta/respuesta.service';
import { RespuestaPregunta } from '../../../shared/models/respuesta-pregunta.model';
import { EstadoItemPlanVisitaPipe } from '../../../pipes/EstadoItemPlanVisita.pipe';
import { lastValueFrom } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../../src/environments/environment';

@Component({
  selector: 'visita-form',
  standalone: true,
  imports: [CommonModule, FormsModule, DestinoFormComponent, DestinoSelectorComponent, EstadoItemPlanVisitaPipe],
  templateUrl: './visita-form.html',
  styleUrls: ['./visita-form.css']
})
export class VisitaFormComponent implements AfterViewInit {

  @Input() equipos: any[] = [];  
  @Input() modo: 'nuevo' | 'editar' | 'lectura' = 'nuevo';
  @Input() registroEditar: any = null;  

  @Output() cerrar = new EventEmitter<void>();
  @Output() guardado = new EventEmitter<any>();

  @ViewChild('destinoSelector')
  destinoSelector!: DestinoSelectorComponent;

  listaPersonas: any[] = [];

  //Permisos
  verTodosLosEquipos: boolean = false;  

  private readonly API_URL = `${environment.api.baseUrl}`;

  private readonly visitPlanService = inject(PlanVisitaService);
  private readonly destinoService = inject(DestinoService);
  private readonly cuestionarioService = inject(CuestionarioService);
  private readonly respuestaService = inject(RespuestaService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChildren('destinoInput') 
  destinoInputs!: QueryList<ElementRef<HTMLInputElement>>;

  @ViewChild('colaboradorSelect')
  colaboradorSelect!: ElementRef<HTMLSelectElement>;

  equipoSeleccionado: number | null = null;
  personaSeleccionada: number | null = null;
  fechaSeleccionada: string = '';

  hoy: string = new Date().toISOString().split('T')[0];

  mostrarValidacion: boolean = false;
  mensajeValidacion = '';

  mostrarModalMensaje: boolean = false;
  mensajeModal: string = "";

  mostrarModalConfirma: boolean = false;  
  mostrarModalSeleccionDestinos: boolean = false;
  filaDestinoSeleccion: number = -1;  

  visitaSeleccionada: any = null;
  visitaEdicion: any = null;
  mostrarModalDetalleVisita = false;
  // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-16 10:42 UTC-5 (Lima)][desc: Soporta MaterialLocalizations para es_PE/es_ES (historial por fecha)][obj: VisitaFormComponent respuestas cuestionario]
  cuestionarioActivo: any = null;
  respuestasCuestionario: RespuestaPregunta[] = [];
  cargandoRespuestas = false;
  mensajeRespuestas = '';

  mostrarModalDestino : boolean = false;
  modoFormularioDestino: 'registro' | 'edicion' = 'registro';
  destinoSeleccionado: any = null;

  // NUEVO: Visitas dinámicas
  cantidadVisitas: number = 1;
  visitasGeneradas: boolean = false;
  visitas: { 
             id: number | null; 
             companyName: string;
             prioridad?: 'MUY_ALTA' | 'ALTA' | 'NORMAL' | '';
             plantillaPv?: string | null;
             direccion?: string | null; //opcional
             destinoId?: number | null; // catálogo
             destinoNombre?: string | null;
             horaCita?: string;
             targetTime?: string;
             state: string;
             startTime?: string;
             endTime?: string;
          }[] = [];

  // Paginación
  paginaActualVisitas: number = 1;
  filasPorPagina: number = 5;

  mostrarEditar: boolean = false;
  puedeEditarPlan: boolean = false;

  get totalPaginasVisitas(): number {
    return Math.ceil(this.visitas.length / this.filasPorPagina);
  }

  ngOnInit() {

    //Permisos
    this.mostrarEditar = this.sessionService.tienePermiso("visitas.editar");    
    this.verTodosLosEquipos = this.sessionService.tienePermiso("visitas.todoslosequipos");    

    this.cargarPersonas();

    //Si entramos a la ventana de editar
    if (this.modo === 'editar') {
      this.personaSeleccionada = this.registroEditar.idUsuario;

      //Y si tiene el permiso para editar y el estado del plan lo permite
      if(this.mostrarEditar && this.registroEditar.estado !== 'COMPLETED') {

        //Y si ademas le fecha del plan es mayor o igual a la fecha actual        
        if(this.esFechaPlanValida(this.fechaSeleccionada)) {
          this.puedeEditarPlan = true;
        }
      }

      //console.log("this.registroEditar: " + JSON.stringify(this.registroEditar,null,2));
    }
  }

  constructor(private  sessionService: SessionService, private http: HttpClient) {}

  ngAfterViewInit(): void {
    if (this.modo === 'nuevo') {
  
      // Esperar un ciclo extra por seguridad (Angular 20 + @if)
      setTimeout(() => {
        if (this.colaboradorSelect) {
          this.colaboradorSelect.nativeElement.focus();
        }
      });
    }
  }
  


  ngOnChanges() {
    if ((this.modo === 'editar' || this.modo === 'lectura') && this.registroEditar) {
  
      //Mostrar los datos ya registrados
      this.equipoSeleccionado = this.registroEditar.idEquipo;  
      this.personaSeleccionada = this.registroEditar.idUsuario;
  
      // Limpiar la fecha (backend trae "2025-11-21T00:00:00-05:00")
      this.fechaSeleccionada = this.registroEditar.fechaPlan
        ? this.registroEditar.fechaPlan.substring(0, 10)
        : '';
    
      //Esto es para que en la ventana de edición ya no permite generar filas de forma masiva.
      this.visitasGeneradas = true;

      //Cargar las visitas existentes

      if (Array.isArray(this.registroEditar.items) && this.registroEditar.items.length > 0) {

        //console.log("this.registroEditar.items", JSON.stringify(this.registroEditar.items, null, 2));

        this.visitas = this.registroEditar.items.map((i: any) => {

          //console.log("Item " + JSON.stringify(i,null,2));

          let hora = null;
        
          // Extraer "HH:mm" de targetTime si existe
          if (i.targetTime) {
            // 1. Convertir el string ISO "2025-12-19T15:12:00Z" a objeto Date
            const fechaObj = new Date(i.targetTime);
            
            // 2. Extraer horas y minutos LOCALES (aquí es donde ocurre la magia)
            // .getHours() devolverá 10 en lugar de 15 porque restará el offset UTC-5
            const hh = String(fechaObj.getHours()).padStart(2, '0');
            const mm = String(fechaObj.getMinutes()).padStart(2, '0');
            
            hora = `${hh}:${mm}`;
          }
        
          return {
            id: i.id,
            companyName: i.companyName,
            prioridad: (i.prioridad ?? 'NORMAL') as 'MUY_ALTA' | 'ALTA' | 'NORMAL',
            plantillaPv: i.plantillaPv ?? null,
            direccion: i.direccion ?? null,   // ← OPCIONAL y seguro
            destinoId: i.destinoId ?? null,
            destinoNombre: i.destinoNombre ?? null,
            horaCita: hora,   // <--- AHORA SÍ SE CARGA LA HORA
            state: i.state,
            complex: i.complex,
            foundProblem: i.foundProblem,
            problemNote: i.problemNote,
            otherInfo: i.otherInfo,
            startTime: i.startTime,
            endTime: i.endTime
          };
        });

        this.visitasGeneradas = true;
      }     
    }
  }


  validar() {

    // === VALIDACIONES OBLIGATORIAS ===
    if (!this.personaSeleccionada) {
      this.mostrarMensajeModal("Seleccione al colaborador.");
      return;
    }

    if (!this.fechaSeleccionada) {
      this.mostrarMensajeModal("Seleccione la fecha.");
      return;
    }

    if (this.modo === 'nuevo') {
      if (!this.esFechaPlanValida(this.fechaSeleccionada)) {
        this.mostrarMensajeModal("La fecha no puede ser menor a la fecha actual.");
        return;
      }
    }

    if(!this.visitasGeneradas) {
      this.mostrarMensajeModal("Debe generar los destinos a visitar.");
      return;
    }

    if (this.visitasGeneradas) {

      // Validar que la lista no esté vacía
      if (!this.visitas || this.visitas.length === 0) {
        this.mostrarMensajeModal("Debe agregar al menos un destino a visitar.");
        return;
      }

      for (let i = 0; i < this.visitas.length; i++) {
        const v = this.visitas[i];
        const fila = i + 1;

        if (!v.companyName || !v.companyName.trim()) {
          this.mostrarMensajeModal(`Seleccione un destino en la fila ${fila}.`);
          return;
        }

        if (!v.direccion || !v.direccion.trim()) {
          this.mostrarMensajeModal(`Ingrese la dirección en la fila ${fila}.`);
          return;
        }

        if (!v.prioridad || v.prioridad.trim() === '') {
          this.mostrarMensajeModal(`Seleccione la prioridad en la fila ${fila}.`);
          return;
        }

        if (!v.plantillaPv || !v.plantillaPv.trim()) {
          this.mostrarMensajeModal(`Ingrese el código de PV en la fila ${fila}.`);
          return;
        }

        // validar hora (opcional pero si hay algo, debe ser completa y válida)
        const okHora = this.validarHoraFila(v);
        
        if (!okHora) {
          return;
        }
      }
    }

    this.validarPlanExiste();
  }


  validarPlanExiste(): void {
    const idPersona: number | null = this.personaSeleccionada;

    if (idPersona == null) {
      this.mostrarMensajeModal("Debe seleccionar una persona.");
      return;
    }  

    if (this.modo === 'editar') {
      //Validacion cuando se edita un plan
      this.visitPlanService
        .existePlanOtroId(idPersona, this.fechaSeleccionada, this.registroEditar.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (existe: boolean) => {

            if (existe) {
              this.mostrarMensajeModal('Ya existe un plan de visita para el colaborador y fecha seleccionada');
            } else {
              this.mostrarModalConfirmacion();
            }
          },
          error: (err: unknown) => {
            console.error('❌ Error validando existencia del plan', err);
          }
        });
    }
    else{
      //Validacion cuando se registra un plan
      this.visitPlanService
        .existePlan(idPersona, this.fechaSeleccionada)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (existe: boolean) => {

            if (existe) {
              this.mostrarMensajeModal('Ya existe un plan de visita para el colaborador y fecha seleccionada');
            } else {
              this.mostrarModalConfirmacion();
            }
          },
          error: (err: unknown) => {
            console.error('❌ Error validando existencia del plan', err);
          }
        });
      }
  }



  guardar() {

    this.ocultarModalConfirmacion();

    let idPlan: number = 0;

    if (this.modo === 'editar' && this.registroEditar) {
      idPlan = this.registroEditar.id;
    }
   
    const data = {
      idPlan: idPlan,
      idPersona: this.personaSeleccionada,
      fechaPlan: this.fechaSeleccionada,
      items: this.visitas.map(v => ({
        id: v.id,
        companyName: v.companyName,
        prioridad: v.prioridad ?? 'NORMAL',
        plantillaPv: v.plantillaPv?.trim() || null,
        direccion: v.direccion?.trim() || null,  // ← opcional
        destinoId: v.destinoId ?? null,
        targetTime: v.horaCita?`${this.fechaSeleccionada}T${v.horaCita}:00-05:00`: null
      }))
    };

    //console.log("data: ", JSON.stringify(data, null, 2));

    this.guardado.emit(data);
  }

  validarHoraFila(v: any): boolean {

    if (!v.horaCita || v.horaCita.trim() === '') {
      // opcional: no hay hora → está bien
      return true;
    }
    if (this.isHoraValida(v.horaCita)) {
      return true;
    }
    if (this.esHoraIncompleta(v.horaCita)) {
      this.mostrarMensajeModal("Hora incompleta. Ingrese horas y minutos (HH:mm).");
      return false;
    }

    this.mostrarMensajeModal("Hora inválida. Formato correcto: HH:mm (00:00 - 23:59).");

    return false;
  }

  // devuelve true si está en formato HH:mm válido (00:00 - 23:59)
  isHoraValida(h?: string): boolean {
    if (!h) return false;
    const re = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return re.test(h);
  }

  // detecta entradas incompletas (ej: "12", "12:", ":30", "8:5", "8")
  esHoraIncompleta(h?: string): boolean {
    if (!h) return false;
    // patrones incompletos útiles
    if (/^\d{1,2}$/.test(h)) return true;        // "8" o "12"
    if (/^\d{1,2}:$/.test(h)) return true;       // "12:"
    if (/^:\d{1,2}$/.test(h)) return true;       // ":30"
    if (/^\d{1,2}:\d{1}$/.test(h)) return true;  // "8:5"
    // cualquier otro que no pase la validación completa y tenga caracteres numéricos/parciales
    if (!/^([01]?\d|2[0-3])?(:[0-5]?\d?)?$/.test(h)) return true;
    return false;
  }

  cerrarModal() {
    this.cerrar.emit();
  }

  

  generarVisitas() {

    if (!this.cantidadVisitas || this.cantidadVisitas < 1) return;
  
    // Genera un array de visitas con id nulo y companyName vacío
    this.visitas = Array.from({ length: this.cantidadVisitas }, () => ({
      id: null,           // id nulo para nuevos registros
      companyName: '',
      prioridad: '',
      plantillaPv: null,
      direccion: null,  // ← opcional
      destinoId: null,
      destinoNombre: null,
      horaCita: '',
      state: 'PENDING'
    }));
  
    this.visitasGeneradas = true;

    // 🔹 Esperar a que Angular renderice la tabla
    setTimeout(() => {
      const primerInput = this.destinoInputs?.first;
      if (primerInput) {
        primerInput.nativeElement.focus();
      }
    });
  }

  agregarFila() {

    this.visitas.push({
      id: null,             // id nulo para un nuevo item
      companyName: '',      // campo editable
      prioridad: '',
      plantillaPv: null,
      direccion: null,   // ← opcional
      destinoId: null,
      destinoNombre: null,
      horaCita: '',
      state: 'PENDING'
    });

    // 🔹 Esperar a que Angular renderice la nueva fila
    setTimeout(() => {
      const ultimoInput = this.destinoInputs?.last;
      if (ultimoInput) {
        ultimoInput.nativeElement.focus();
      }
    });
  }





  eliminarFila(i: number) {
    this.visitas.splice(i, 1);
  }

  subirFila(i: number) {
    if (i === 0) return;
    [this.visitas[i - 1], this.visitas[i]] = [this.visitas[i], this.visitas[i - 1]];
  }

  bajarFila(i: number) {
    if (i === this.visitas.length - 1) return;
    [this.visitas[i + 1], this.visitas[i]] = [this.visitas[i], this.visitas[i + 1]];
  }

  siguientePagina() {
    this.paginaActualVisitas = this.paginaActualVisitas + 1;
  }

  anteriorPagina() {
    this.paginaActualVisitas = this.paginaActualVisitas - 1;
  }

  controlarEntradaHora(event: KeyboardEvent) {
    const key = event.key;
  
    // ✔ permitir borrar para dejar vacío
    if (key === 'Backspace' || key === 'Delete') {
      const input = event.target as HTMLInputElement;
      input.value = '';
      return;
    }
  
    // ✔ permitir usar TAB para moverse
    if (key === 'Tab') {
      return;
    }
  
    // ❌ bloquear cualquier escritura manual
    event.preventDefault();
  }
  

  mostrarModalConfirmacion() {    
    this.mostrarModalConfirma = true;
  }

  ocultarModalConfirmacion() {    
    this.mostrarModalConfirma = false;
  }


  mostrarMensajeModal(mensaje: string): void {
    this.mostrarModalMensaje = true;
    this.mensajeModal = mensaje;
  }

  cerrarMensajeModal(): void {
    this.mostrarModalMensaje = false;
    this.mensajeModal = "";
  }


  esFechaPlanValida(fecha: string): boolean {
    if (!fecha) return false;
  
    // Fecha seleccionada (YYYY-MM-DD)
    const fechaPlan = new Date(fecha + 'T00:00:00');
  
    // Fecha actual sin hora
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
  
    return fechaPlan >= hoy;
  }


  verDetalleVisita(visita: any) {
    this.visitaSeleccionada = visita;
    this.mostrarModalDetalleVisita = true;
    // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-16 10:42 UTC-5 (Lima)][desc: Soporta MaterialLocalizations para es_PE/es_ES (historial por fecha)][obj: VisitaFormComponent.verDetalleVisita respuestas]
    this.cargarRespuestasCuestionario();

    //console.log("visitaSeleccionada: " + JSON.stringify(this.visitaSeleccionada,null,2));
  }
  
  cerrarModalDetalleVisita() {
    this.mostrarModalDetalleVisita = false;
    this.visitaSeleccionada = null;
    // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-16 10:42 UTC-5 (Lima)][desc: Soporta MaterialLocalizations para es_PE/es_ES (historial por fecha)][obj: VisitaFormComponent.cerrarModalDetalleVisita respuestas]
    this.cuestionarioActivo = null;
    this.respuestasCuestionario = [];
    this.cargandoRespuestas = false;
    this.mensajeRespuestas = '';
  }

  // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-16 10:42 UTC-5 (Lima)][desc: Soporta MaterialLocalizations para es_PE/es_ES (historial por fecha)][obj: VisitaFormComponent.cargarRespuestasCuestionario]
  cargarRespuestasCuestionario() {
    const idItem = this.visitaSeleccionada.id;
    this.respuestasCuestionario = [];
    this.mensajeRespuestas = '';

    if (!idItem) {
      this.mensajeRespuestas = 'No hay id de item para mostrar respuestas.';
      return;
    }

    this.cargandoRespuestas = true;
    
    this.respuestaService.obtenerPorItem(idItem).subscribe({
      next: (respuestas) => {
        this.respuestasCuestionario = respuestas || [];
        if (!this.respuestasCuestionario.length) {
          this.mensajeRespuestas = 'No hay respuestas registradas.';
        }
        this.cargandoRespuestas = false;
      },
      error: () => {
        this.mensajeRespuestas = 'No se pudieron cargar las respuestas.';
        this.cargandoRespuestas = false;
      }
    });
        
  }

  //Para el modal de busqueda de destinos
  abrirBusquedaDestino(i: number) {
    this.filaDestinoSeleccion = i;
    this.mostrarModalSeleccionDestinos = true;
  }

  cerrarModalBusquedaDestino() {
    this.mostrarModalSeleccionDestinos = false;
  }
  

  onDestinoSeleccionado(d: DestinoResultado) {
    if (this.filaDestinoSeleccion < 0 || this.filaDestinoSeleccion >= this.visitas.length) return;

    const v = this.visitas[this.filaDestinoSeleccion];

    //Asigna los valores del registro seleccionado
    v.destinoId = d.id;
    v.destinoNombre = d.nombre;
    v.companyName = d.nombre;
    v.direccion = d.direccion ?? null;

    console.log("v.destinoId: " + v.destinoId);

    //Oculta el modal
    this.mostrarModalSeleccionDestinos = false;
  }

  limpiarDestino(v: any) {
    v.destinoId = null;
    v.destinoNombre = null;    
    v.companyName = "";
    v.direccion = "";
  }


  //Para el modal de registro de destino
  nuevoDestinoModalBusqueda() {

      this.modoFormularioDestino = 'registro';
      this.mostrarModalDestino = true;      

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
      
  }

  onDestinoGuardado(data: any): void {
    
    //console.log("onDestinoGuardado(), data: " + data);

    if(this.visitaEdicion) {
      //Asigna los valores del registro seleccionado para edicion
      this.visitaEdicion.destinoNombre = data.nombre;
      this.visitaEdicion.companyName = data.nombre;
      this.visitaEdicion.direccion = data.direccion ?? null;
      this.visitaEdicion = null;
      
      //console.log("onDestinoGuardado(), data.nombre=" + data.nombre + ", data.direccion=" + data.direccion);
    }
    else {
      //Al registrar un destino, se llama a una función del hijo y se le pasa el objeto
      this.destinoSelector.recargarConNuevoDestino(data);
    }
  
    //Cerrar
    this.mostrarModalDestino = false;    
  }

  onDestinoCerrado(): void {
    this.mostrarModalDestino = false;    
    this.visitaEdicion = null;
  }


  cargarPersonas() {

    const session = this.sessionService.getSession();

    if(this.verTodosLosEquipos) {
      this.cargarPersonasCampoTodas();
    }
    else {
      //Este bloque es valido cuando se desea filtrar las personas que son supervisadas por el usuario de la sesion.
      if (session?.idUsuario) {      
        this.cargarPersonasUsuario(session.idUsuaSist);
      }
      else {
        this.mostrarMensajeModal('⚠️ No se pudo obtener la sesión del usuario.');
      }
    }
  }
 
  async cargarPersonasCampoTodas(): Promise<void> {

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

        //Selecciona el primer elemento de la lista, cuando estamos registrando
        if (this.modo === 'nuevo') {
          this.personaSeleccionada = null;
        }
      } else {
        this.listaPersonas = [];
        this.mostrarMensajeModal('⚠️ No se encontraron personas disponibles.');
      }
    } catch (error) {
      console.error('Error al cargar personas:', error);
      this.mostrarMensajeModal('⚠️ No se pudo cargar la lista de personas.');
    } finally {
    }
  }

  async cargarPersonasUsuario(idUsuario: string | number): Promise<void> {
    
    try {
      const params = new HttpParams()
        .set('idSupervisor', idUsuario.toString());

      const response = await lastValueFrom(
        this.http.get<any>(`${this.API_URL}/api/users/supervisados`, { params })
      );
  
      // El backend devuelve: { codigoResultado, mensajeResultado, resultados: [...] }
      if (response && Array.isArray(response.resultados)) {
        //console.log("response: " + JSON.stringify(response,null,2));

        this.listaPersonas = response.resultados.map((p: any) => ({
          idUsuario: p.id.toString(),
          usuario: p.nombre
        }));

        //console.log("this.personas: " + JSON.stringify(this.listaPersonas,null,2));

        //Selecciona el primer elemento de la lista, cuando estamos registrando
        if (this.modo === 'nuevo') {
          this.personaSeleccionada = null;
        }
      } else {
        this.listaPersonas = [];
        this.mostrarMensajeModal('⚠️ No se encontraron personas disponibles.');
      }
    } catch (error) {
      console.error('Error al cargar personas:', error);
      this.mostrarMensajeModal('⚠️ No se pudo cargar la lista de personas.');
    } finally {
    }
  }


    //Para el modal de actualizacion de destino
    mostrarModalEdicionDestino(visita: any) {
  
      if (!visita.destinoId) {
        this.mostrarMensajeModal('Seleccione el destino');
        return;
      }  

      //Guardar la visita seleccionada
      this.visitaEdicion = visita;
  
      //Obtener los datos del destino seleccionado
      this.destinoService.obtenerDestinoPorId(visita.destinoId).subscribe({
        next: resp => {
  
          if (resp.codigoResultado === '2' && resp.resultados?.length) {
            //Recupera los datos del destino seleccionado
            this.destinoSeleccionado = resp.resultados[0];
  
            this.modoFormularioDestino = 'edicion';
            this.mostrarModalDestino = true;
          } 
          else {
            this.visitaEdicion = null;
            this.mostrarMensajeModal('No se pudo obtener el destino.');
          }
        },
        error: err => {
          console.error(err);
          this.mostrarMensajeModal('Error consultando el destino.');
        }
      });
      
    }
  
  
  

}
