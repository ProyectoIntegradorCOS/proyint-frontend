import { Component, EventEmitter, Output, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlanVisitaService } from '../../../services/plan-visita/plan-visita.service';
import { MetricsService } from '../../../services/metrics/metrics.service';
import { VisitaMasivaFila } from '../../../shared/models/visita-masivo';
import { ColaboradorService } from '../../../services/colaborador/colaborador.service';
import { DestinoService, DestinoResultado} from '../../../services/destino/destino.service';
import { SessionService } from '../../../services/session/session.service';
import { lastValueFrom } from 'rxjs';
import { DestinoFormComponent } from '../../destino/destino-form/destino-form';
import { DestinoSelectorComponent } from '../../destino/destino-selector/destino-selector';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../../src/environments/environment';

@Component({
  selector: 'app-visita-masivo',
  standalone: true,
  imports: [CommonModule, FormsModule, DestinoFormComponent, DestinoSelectorComponent],
  templateUrl: './visita-masivo.html',
  styleUrl: './visita-masivo.css',
})
export class VisitaMasivoComponent {

  visitas: VisitaMasivaFila[] = [];
  prioridades = ['MUY_ALTA', 'ALTA', 'NORMAL'];

  listaPersonas: any[] = [];

  mostrarModalMensaje: boolean = false;
  mensajeModal: string = "";

  mostrarModalMensajeCierre: boolean = false;
  mensajeCierreModal: string = "";

  mostrarModalConfirmaImportar: boolean = false;
  mostrarModalConfirmaGuardar: boolean = false;

  mostrarCargaArchivo = true;

  archivoFueImportado : boolean = false;

  mostrarCarga : boolean = false;

  archivoExcel: File | null = null;

  cargaExpandida = false; // ← colapsado por defecto

  fechaActual: string = new Date().toISOString().split('T')[0];

  //Para el modal de registro y actualizacion  del destino
  mostrarModalFormularioDestino : boolean = false;
  modoFormularioDestino: 'registro' | 'edicion' = 'registro';
  destinoSeleccionado: any = null;
  visitaEnValidacion: any = null;

  @Output() cerrar = new EventEmitter<void>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  @ViewChild('destinoSelector')
  destinoSelector!: DestinoSelectorComponent;

  //Variables para la vinculacion con el catalogo de destinos
  filaDestinoSeleccion: number = -1;
  mostrarModalDestinos: boolean = false;

  private readonly API_URL = `${environment.api.baseUrl}`;

  //Permisos
  verTodosLosEquipos: boolean = false;  



  constructor(
    private planVisitaService: PlanVisitaService,
    private colaboradorService: ColaboradorService,
    private destinoService: DestinoService,
    private sessionService: SessionService,
    private metricsService: MetricsService,
    private http: HttpClient
  ) {}


  ngOnInit(): void {
    
    //Permisos
    this.verTodosLosEquipos = this.sessionService.tienePermiso("visitas.todoslosequipos");    

    this.cargarPersonas();
  }

  mostrarMensajeModal(mensaje: string): void {
    this.mostrarModalMensaje = true;
    this.mensajeModal = mensaje;
  }

  mostrarMensajeCierre(mensaje: string): void {
    this.mostrarModalMensajeCierre = true;
    this.mensajeCierreModal = mensaje;
  }

  cerrarMensajeModal(): void {
    this.mostrarModalMensaje = false;
    this.mensajeModal = "";
  }

  mostrarModalConfimaImportacion() {
    this.mostrarModalConfirmaImportar = true;    
  }

  cerrarModalConfimaImportacion() {
    this.mostrarModalConfirmaImportar = false;    
  }  

  cancelarImportacion() {
    this.cerrarModalConfimaImportacion();
    this.limpiarArchivo();
  }

  limpiarArchivo() {
    this.fileInput.nativeElement.value = '';
    this.archivoExcel = null;
  }

  onExcelSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    this.archivoExcel = file;

    this.validarExcelImportar();
  }

  mostrarModalConfimaGuardar() {
    this.mostrarModalConfirmaGuardar = true;    
  }

  cerrarModalConfimaGuardar() {
    this.mostrarModalConfirmaGuardar = false;    
  }
  


  validarExcelImportar() {
    const usuario = this.sessionService.getSession()?.usuario;
    if (!usuario) {
      this.mostrarMensajeModal('No se pudo determinar el usuario de sesión.');
      return;
    }

    if (!this.archivoExcel) {
      this.mostrarMensajeModal('Seleccione un archivo (.xlsx) para importar.');
      return;
    }

    this.mostrarModalConfimaImportacion();    
  }


  async importarExcel(): Promise<void> {
    this.cerrarModalConfimaImportacion();

    if (!this.archivoExcel) {
      this.mostrarMensajeModal('Seleccione un archivo (.xlsx) para importar.');
      return;
    }

    const inicio = Date.now();
    try {
      this.mostrarCarga = true;

      //Enviar el archivo al backend
      const resp: any = await lastValueFrom(
        this.planVisitaService.importarExcel(this.archivoExcel)
      );
    
      this.mostrarCarga = false;

      //console.log('Respuesta backend:', JSON.stringify(resp,null,2));
    
      if (!resp || !Array.isArray(resp.resultados) || resp.resultados.length === 0) {
        this.mostrarMensajeModal('La respuesta del servidor es inválida.');
        return;
      }
    
      const resultado = resp.resultados[0];
      const validacion = resultado.resultadoValidacion;
    
      if (!validacion || !validacion.tipoResultado) {
        this.mostrarMensajeModal('No se pudo validar el resultado de la importación.');
        return;
      }
    
      // 🔴 CASO: Importación con errores
      if (validacion.tipoResultado === 'CON_ERRORES') {
        this.mostrarMensajeModal(
          validacion.mensaje || 'El archivo contiene errores y no puede ser procesado.'
        );
        this.metricsService.trackEvent({
          action: 'plan_import_masivo',
          screen: 'planes_masivo',
          status: 'error',
          durationMs: Date.now() - inicio
        });
    
        // Limpia archivo y mantiene la vista inicial
        this.limpiarArchivo();
        this.mostrarCargaArchivo = true;
        return;
      }
    
      // 🟢 CASO: Importación sin errores
      if (validacion.tipoResultado === 'SIN_ERRORES') {
    
        if (!Array.isArray(resultado.listaItemsExcel)) {
          this.mostrarMensajeModal('No se encontraron datos válidos para importar.');
          return;
        }
    
        //Convierte los datos devueltos por el backend al modelo del frontend
        this.visitas = resultado.listaItemsExcel.map((item: VisitaMasivaFila) => ({
          ...item,
          fecha: this.convertirFechaParaInput(item.fecha)
        }));
    
        // Oculta el bloque de carga
        this.mostrarCargaArchivo = false;
        this.cargaExpandida = false;
    
        // Limpia el input file
        this.limpiarArchivo();
    
        this.mostrarMensajeModal(`Se extrajo el contenido del archivo, revise, y de ser necesario complete, los datos.`);
        this.archivoFueImportado = true;
        this.metricsService.trackEvent({
          action: 'plan_import_masivo',
          screen: 'planes_masivo',
          status: 'success',
          durationMs: Date.now() - inicio
        });
      }    
    }
    catch (error) {
      console.error('Error importando Excel:', error);
      this.mostrarCarga = false;

      this.metricsService.trackEvent({
        action: 'plan_import_masivo',
        screen: 'planes_masivo',
        status: 'error',
        durationMs: Date.now() - inicio
      });
      this.mostrarMensajeModal('Ocurrió un error al importar el Excel.');
    }
  }


  agregarFila() {
    this.visitas.push({
      colaboradorId: 0,
      fecha: '',
      destinoNombre: '',
      direccion: '',
      horaCita: '',
      prioridad: '',
      plantillaPv: '',
      destinoId: null,
      validado: true,  //Es un nuevo registro, el usuario seleccionará los datos, no requiere otra validacion
      mensajeValidacion: ''
    });

    this.mostrarCargaArchivo = false; // 👈 ocultar file
    this.cargaExpandida = false;
  }

  eliminarFila(index: number) {
    this.visitas.splice(index, 1);

    if(this.visitas.length == 0) {
      this.mostrarCargaArchivo = true; // 👈 Mostrar file
      this.cargaExpandida = false;
    }
  }

  cerrarModal() {
    this.cerrar.emit();
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

  private convertirFechaParaInput(fecha: string | null): string {
    if (!fecha) return '';
  
    // Espera formato dd/MM/yyyy
    const partes = fecha.split('/');
    if (partes.length !== 3) return '';
  
    const [dia, mes, anio] = partes;
    return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  }


  toggleCarga(): void {
    this.cargaExpandida = !this.cargaExpandida;
  }



  validarVisitas(): boolean {

    if (!this.visitas || this.visitas.length === 0) {
      this.mostrarMensajeModal('Debe agregar al menos una fila de visita.');
      return false;
    }
  
    //Variable para identificar repetidos
    const clavesUnicas = new Set<string>();

    for (let i = 0; i < this.visitas.length; i++) {
      const v = this.visitas[i];
      const fila = i + 1;
  
      if (!v.colaboradorId || v.colaboradorId === 0) {
        this.mostrarMensajeModal(`Seleccione un colaborador en la fila ${fila}.`);
        return false;
      }

      //Validar que exista en la lista desplegable
      const existeColaborador = this.listaPersonas.some(
        c => c.idUsuario == v.colaboradorId
      );

      if (!existeColaborador) {
        this.mostrarMensajeModal(`El colaborador seleccionado no es válido en la fila ${fila}.`);
        return false;
      }
  
      if (!v.fecha || v.fecha.trim() === '') {
        this.mostrarMensajeModal(`Seleccione la fecha en la fila ${fila}.`);
        return false;
      }

      // validar que la fecha no sea menor a la fecha actual
      const fechaVisita = new Date(v.fecha + 'T00:00:00');
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      if (fechaVisita < hoy) {
        this.mostrarMensajeModal(
          `La fecha no puede ser menor a la fecha actual en la fila ${fila}.`
        );
        return false;
      }
  
      if (!v.destinoId) {
        this.mostrarMensajeModal(`Seleccione un destino en la fila ${fila}.`);
        return false;
      }
  
      if (!v.destinoNombre || v.destinoNombre.trim() === '') {
        this.mostrarMensajeModal(`El destino es obligatorio en la fila ${fila}.`);
        return false;
      }
  
      if (!v.direccion || v.direccion.trim() === '') {
        this.mostrarMensajeModal(`Ingrese la dirección en la fila ${fila}.`);
        return false;
      }
  
      // ⏰ horaCita es opcional → NO se valida
  
      if (!v.prioridad || v.prioridad.trim() === '') {
        this.mostrarMensajeModal(`Seleccione la prioridad en la fila ${fila}.`);
        return false;
      }
  
      if (!this.prioridades.includes(v.prioridad)) {
        this.mostrarMensajeModal(`La prioridad seleccionada no es válida en la fila ${fila}.`);
        return false;
      }
  
      if (!v.plantillaPv || v.plantillaPv.trim() === '') {
        this.mostrarMensajeModal(`Ingrese el código de plantilla en la fila ${fila}.`);
        return false;
      }
  
      if (!v.validado) {
        this.mostrarMensajeModal(`Debe validar ✅ el destino (coordenadas de la dirección) en la fila ${fila}.`);
        return false;
      }

      // Validar filas duplicadas (colaborador + fecha + destino (incluye direccion))
      const clave = `${v.colaboradorId}|${v.fecha}|${v.destinoId}`;

      if (clavesUnicas.has(clave)) {
        this.mostrarMensajeModal(`Existen datos duplicados (colaborador, fecha, destino y dirección) en la fila ${fila}.`);
        return false;
      }

      clavesUnicas.add(clave);
    }
  
    return true;
  }


  validar() {

    if (!this.validarVisitas()) {
      return; // ❌ se corta si hay errores
    }
  
    // ✅ continuar flujo normal
    //console.log("visitas: " + JSON.stringify(this.visitas,null,2));
    this.mostrarModalConfimaGuardar();    
  }


  guardarMasivo(): void {
  
    const usuario = this.sessionService.getSession()?.usuario;
    if (!usuario) {
      this.mostrarMensajeModal('No se pudo determinar el usuario de sesión.');
      return;
    }
  
    this.cerrarModalConfimaGuardar();    
    this.mostrarCarga = true;

    const inicio = Date.now();
    this.planVisitaService
      .guardarMasivo(usuario, this.visitas)
      .subscribe({
  
        next: resp => {
          //console.log("resp: " + JSON.stringify(resp,null,2));          
          this.mostrarCarga = false;
          
          //Evaluar respuesta
          if(resp.codigoResultado === '2') {
            //Exito
            this.visitas = [];
            this.mostrarCargaArchivo = true;
            this.archivoFueImportado = false;          
            this.mostrarMensajeCierre(resp?.mensajeResultado || 'Proceso terminado correctamente.');          
            this.metricsService.trackEvent({
              action: 'plan_guardar_masivo',
              screen: 'planes_masivo',
              status: 'success',
              durationMs: Date.now() - inicio
            });
          }
          else {
            //No pasa la validacion, algun plan ya existe
            this.metricsService.trackEvent({
              action: 'plan_guardar_masivo',
              screen: 'planes_masivo',
              status: 'error',
              durationMs: Date.now() - inicio
            });
            this.mostrarMensajeModal(resp?.mensajeResultado || 'Error de validación, algún plan ya existe.');
          }
        },
  
        error: err => {          
          console.error('Error guardando visitas:', err);
          this.mostrarCarga = false;

          this.metricsService.trackEvent({
            action: 'plan_guardar_masivo',
            screen: 'planes_masivo',
            status: 'error',
            durationMs: Date.now() - inicio
          });
          this.mostrarMensajeModal(
            err?.error?.mensaje || 'Ocurrió un error al guardar los planes.'
          );
        }
      });
  }



  //Para el modal de busqueda de destinos
  abrirBusquedaDestino(i: number) {
    this.filaDestinoSeleccion = i;
    this.mostrarModalDestinos = true;
  }

  cerrarModalBusquedaDestino() {
    this.mostrarModalDestinos = false;
  }

  onDestinoSeleccionado(d: DestinoResultado) {
    if (this.filaDestinoSeleccion < 0 || this.filaDestinoSeleccion >= this.visitas.length) return;
    
    const v = this.visitas[this.filaDestinoSeleccion];
    
    //Asigna los valores del registro seleccionado
    v.destinoId = d.id;
    v.destinoNombre = d.nombre;
    v.direccion = d.direccion?? ''; //Si d.direccion es null o undefined, se asigna un string vacío.

    //Oculta el modal
    this.mostrarModalDestinos = false;
  }

  limpiarDestino(v: any) {
    v.destinoId = null;
    v.destinoNombre = '';    
    v.direccion = '';
  }


  
  //Para el modal de registro de destino
  mostrarModalNuevoDestino() {

    this.modoFormularioDestino = 'registro';
    this.mostrarModalFormularioDestino = true;    

    this.destinoSeleccionado = {
      id: null,
      codigo: '',
      nombre: '',
      categoria: '',
      direccion: null,
      referencia: null,
      zona: null,
      horarios: null,
      contacto: null,
      precision: 'APROXIMADO',
      activo: true
    };
    
  }


  //Para el modal de actualizacion de destino
  mostrarModalEdicionDestino(visita: VisitaMasivaFila) {

    this.visitaEnValidacion = visita;

    if (!visita.destinoId) {
      this.mostrarMensajeModal('La visita no tiene un id de destino válido.');
      return;
    }  

    this.mostrarCarga = true;

    this.destinoService.obtenerDestinoPorId(visita.destinoId).subscribe({
      next: resp => {
        this.mostrarCarga = false;

        if (resp.codigoResultado === '2' && resp.resultados?.length) {
          //Recupera los datos del destino seleccionado
          this.destinoSeleccionado = resp.resultados[0];

          this.modoFormularioDestino = 'edicion';
          this.mostrarModalFormularioDestino = true;
        } else {
          this.mostrarMensajeModal('No se pudo obtener el destino.');
        }
      },
      error: err => {
        console.error(err);
        this.mostrarCarga = false;
        this.mostrarMensajeModal('Error consultando el destino.');
      }
    });
    
  }

  onDestinoGuardado(data: any): void {
    console.log("onDestinoGuardado(), data: " + data);

    if (this.visitaEnValidacion) {    
      //Asigna los valores del registro seleccionado para validacion
      this.visitaEnValidacion.destinoNombre = data.nombre;
      this.visitaEnValidacion.direccion = data.direccion ?? null;

      //Limnpia las variables de validacion
      this.visitaEnValidacion.validado = true;
      this.visitaEnValidacion.mensajeValidacion = null;
      this.visitaEnValidacion = null;
    }
    else {
      //Al registrar un destino, se llama a una función del hijo y se le pasa el objeto
      this.destinoSelector.recargarConNuevoDestino(data);
    }

    //Cerrar
    this.mostrarModalFormularioDestino = false;    
  }

  onDestinoCerrado(): void {
    this.mostrarModalFormularioDestino = false;    
    this.visitaEnValidacion = null;
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

}
