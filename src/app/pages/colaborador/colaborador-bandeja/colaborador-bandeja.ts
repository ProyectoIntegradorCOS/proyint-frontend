import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { lastValueFrom } from 'rxjs';
import { ColaboradorForm } from '../colaborador-form/colaborador-form';
import { ColaboradorService } from '../../../services/colaborador/colaborador.service';
import { EquipoService } from '../../../services/equipo/equipo.service'; 
import { UsuarioSincronizar, SincronizacionResponse, UsuarioSaaDTO } from '../../../services/colaborador/colaborador.service';
import { HorarioService, Horario } from '../../../services/horario/horario.service';
import { Respuesta } from '../../../shared/models/respuesta';
import { SessionService } from '../../../services/session/session.service';

interface Colaborador {
  nombre: string;
  usuario: string; 
  estado: string;
  estadoDescripcion: string;
  equipoId: number | null;
  equipoNombre: string;
  horarioId: number | null;
  horarioNombre: string;
}

// Interfaz para la lista desplegable de equipos
interface EquipoSimple {
  id: number;
  nombre: string;
}

// Interfaz para los filtros
interface Filtros {
  nombre: string;
  equipoId: number | null; // Cambiado para aceptar null
}

@Component({
  selector: 'app-colaborador-bandeja',
  standalone: true,
  imports: [CommonModule, FormsModule, ColaboradorForm],
  templateUrl: './colaborador-bandeja.html',
  styleUrls: ['./colaborador-bandeja.css']
})
export class ColaboradorBandeja implements OnInit {

  // *** CAMBIO CLAVE: Inicialización de equipoId a null ***
  // Esto asegura que la opción <option [ngValue]="null">Todos los Equipos</option> esté seleccionada al inicio.
  filtros: Filtros = { nombre: '', equipoId: null };
  
  // Se actualiza el tipo de Filtros Ejecutados también
  filtrosEjecutados: Filtros = { nombre: '', equipoId: null }; 

  colaboradores: Colaborador[] = [];
  equipos: EquipoSimple[] = []; // Lista de equipos
  horarios: Horario[] = [];

  paginaActual = 1;
  tamanioPagina = 10; 
  orden = "asc";
  columnaOrden = "nombre"; 
  
  codigoResultado = -1;
  mensajeResultado = ''; 
  totalPaginas = 1;

  mostrarMensaje = false;
  mensajeTexto = '';

  mostrarModalForm: boolean = false;
  colaboradorAEditar: any = null;

  mostrarCarga: boolean = false;

  totalRegistros = 0;

  paginas: number[] = [];


  //Variables para la sincronizacion
  // Controladores de modales
  mostrarModalDatosSincronizacionDetalle: boolean = false;
  mostrarModalConfirmaSincronizacion: boolean = false;
  
  // Lista unificada para el modal de detalle
  usuariosASincronizar: UsuarioSincronizar[] = [];

  mostrarEditar: boolean = false;

  constructor(
    private http: HttpClient,
    private colaboradorService: ColaboradorService,
    private equipoService: EquipoService,
    private horarioService: HorarioService,
    private sessionService: SessionService
  ) {}

  ngOnInit(): void {
    // Solo carga las listas desplegables, NO ejecuta la búsqueda.
    this.cargarEquipos();
    this.cargarHorarios();
    
    this.mostrarEditar = this.sessionService.tienePermiso("usuarios.editar");

    if(this.sessionService.tienePermiso("usuarios.sincronizar")) {      
      this.cargarDatosSincronizacion();
    }

    this.buscar();
  }

  // MÉTODO: Carga la lista de equipos disponibles para el filtro
  async cargarEquipos() {
    try {      
      this.mostrarCarga = true;
      const data: any = await lastValueFrom(this.equipoService.listarActivos()); 
      this.mostrarCarga = false;
      this.equipos = data.resultados || [];
    } 
    catch (error) {
      this.mostrarCarga = false;
      console.error('Error al cargar la lista de equipos', error);
      this.equipos = [];
      //this.mostrarModalMensaje('Error al cargar la lista de equipos.');
    }
  }


  // MÉTODO: Carga la lista de equipos disponibles para el filtro
  async cargarHorarios() {
    try {      
      this.mostrarCarga = true;

      this.horarioService.getHorarios().subscribe({
        next: (data) => this.horarios = data,
        error: (err) => console.error('Error al cargar horarios', err)
      });

      this.mostrarCarga = false;
    } 
    catch (error) {
      this.mostrarCarga = false;
      console.error('Error al cargar la lista de horarios', error);
      this.horarios = [];
      this.mostrarModalMensaje('Error al cargar la lista de horarios.');
    }
  }


  // Lógica principal de búsqueda (Iniciada por el botón "Buscar")
  async buscar() {
    
    // 1. Guardar los filtros de entrada en los filtros ejecutados.
    this.filtrosEjecutados = { ...this.filtros }; 
    this.paginaActual = 1; // Siempre vuelve a la página 1 al iniciar una nueva búsqueda

    // 3. Ejecutar la búsqueda con los filtros recién guardados.
    await this._buscarConFiltros(this.filtrosEjecutados);
  }

  // 🔄 FUNCIÓN: Refresca la tabla usando los últimos filtros ejecutados.
  async refrescarDatos() {
    // Se ajusta la advertencia para permitir el refresco si hay equipoId o si la búsqueda inicial fue nula
    if (!this.filtrosEjecutados.nombre && this.filtrosEjecutados.equipoId === null) {
        //console.log("No hay filtros ejecutados que produzcan resultados únicos. No se refresca la tabla."); 
        // Nota: En la práctica, se recomienda refrescar siempre con los filtrosEjecutados,
        // incluso si son nulos, para actualizar la tabla. Mantendremos el llamado a _buscarConFiltros.
    }
    await this._buscarConFiltros(this.filtrosEjecutados);
  }

  // ⚙️ FUNCIÓN PRIVADA: Ejecuta la lógica de la llamada a la API con un objeto de filtros dado.
  private async _buscarConFiltros(filtros: Filtros) {
    
    // Se construye el objeto de filtros a pasar al servicio, incluyendo paginación/orden
    const filtrosBusqueda = {
        nombre: filtros.nombre, 
        // Si el valor es null, enviamos undefined para que el servicio omita el parámetro en la URL.
        equipoId: filtros.equipoId === null ? "-1" : filtros.equipoId.toString(),
        pagina: this.paginaActual.toString(),
        tamanioPagina: this.tamanioPagina.toString(),
        orden: this.orden,
        columnaOrden: this.columnaOrden,
    };

    try {
      this.mostrarCarga = true;
      // Se utiliza lastValueFrom para convertir el Observable del servicio en una promesa
      const data: any = await lastValueFrom(this.colaboradorService.buscarColaboradores(filtrosBusqueda));
      this.mostrarCarga = false;

      //console.log("data:", JSON.stringify(data,null,2));

      this.codigoResultado = data.codigoResultado;
      this.mensajeResultado = data.mensajeResultado;
      this.colaboradores = data.resultados || [];
      this.totalPaginas = data.totalPaginas || 1;
      this.paginaActual = data.paginaActual;
      this.totalRegistros = data.totalRegistros;
      this.generarPaginas();

    } catch (error) {
      this.mostrarCarga = false;
      console.error('Error al realizar la búsqueda', error);
      this.mostrarModalMensaje('Error al realizar la búsqueda');
    }
  }

  limpiarFiltros() {
    this.filtros = { nombre: '', equipoId: null };
    this.paginaActual = 1;

    this.buscar();
  }



  mostrarModalMensaje(texto: string) {
    this.mensajeTexto = texto;
    this.mostrarMensaje = true;
  }

  cerrarModalMensaje() {
    this.mostrarMensaje = false;
  }

  // 🚀 MÉTODO PARA ABRIR EL MODAL (REGISTRO)
  nuevoColaborador(): void {
    this.colaboradorAEditar = null; 
    this.mostrarModalForm = true; 
  }
  
  // 🚀 MÉTODO PARA ABRIR EL MODAL (EDICIÓN)
  editar(colaborador: any): void {
    this.colaboradorAEditar = colaborador; 
    this.mostrarModalForm = true;
  }

  // 🔔 MÉTODO CLAVE: Cerrar modal y refrescar la bandeja
  cerrarModalForm(refrescar: boolean): void {
    this.mostrarModalForm = false;
    this.colaboradorAEditar = null; 
  
    if (refrescar) {
      this.refrescarDatos(); // Llama a refrescar, que usa this.filtrosEjecutados
    }
  }





  //Funciones para la sincronización
  /**
   * Llama al backend para ver si hay usuarios pendientes de sincronizar.
   */
  cargarDatosSincronizacion(): void {
    this.colaboradorService.obtenerDatosSincronizar().subscribe({
      next: (res: SincronizacionResponse) => {

        //console.log("res: " + JSON.stringify(res, null,2));

        const hayNuevos = res.listaUsuariosNuevosSAA && res.listaUsuariosNuevosSAA.length > 0;
        const hayActivar = res.listaUsuariosSAALocalesActivar && res.listaUsuariosSAALocalesActivar.length > 0;

        if (hayNuevos || hayActivar) {
          // Unificar y etiquetar las listas
          this.usuariosASincronizar = [
            ...this.mapUsuarios(res.listaUsuariosNuevosSAA, 'NUEVO'),
            ...this.mapUsuarios(res.listaUsuariosSAALocalesActivar, 'REACTIVAR')
          ];
          
          //this.mostrarModalDatosSincronizacion = true;
          this.mostrarModalDatosSincronizacionDetalle = true;
        }
      },
      error: (err) => {
        console.error('Error al obtener datos de sincronización', err);
        // Manejo de errores
      }
    });
  }

  /**
   * Mapea el DTO de SAA al modelo de FE, añadiendo campos de control (tipo, idEquipo, etc.).
   * @param lista La lista de usuarios SAA.
   * @param tipo El tipo de usuario ('NUEVO' o 'REACTIVAR').
   * @returns Lista de UsuarioSincronizar.
   */
  private mapUsuarios(lista: UsuarioSaaDTO[], tipo: 'NUEVO' | 'REACTIVAR'): UsuarioSincronizar[] {
    if (!lista) return [];
    return lista.map(u => ({
      ...u,
      tipo: tipo,
      idEquipo: null,
      idHorario: null,
      nombreCompleto: `${u.nombres} ${u.apePaterno} ${u.apeMaterno}` // Campo útil para la tabla      
    }));
  }


  validarDatosSincronizacion(): void {
    // 1. Validación (se mantiene igual)
    const datosHorarioValidos = this.usuariosASincronizar.every(u => u.idHorario !== null);
    const datosEquipoValidos = this.usuariosASincronizar.every(u => u.idEquipo !== null);

    if (!datosHorarioValidos) {
        this.mostrarModalMensaje('Seleecione el Horario.');
        return;
    }

    if (!datosEquipoValidos) {
        this.mostrarModalMensaje('Seleccione el Equipo.');
        return;
    }

    this.mostrarModalConfirmaSincronizacion = true;
  }

  cerrarModalConfirmaSincronizacion(): void {
    this.mostrarModalConfirmaSincronizacion = false;    
  }


  /**
   * Lógica para guardar la sincronización.
   */
  guardarDatosSincronizacion(): void {
    
    // 1. Ocultar el mensaje de confirmacion
    this.mostrarModalConfirmaSincronizacion = false;

    // 2. Llamada al servicio para guardar
    //console.log('Datos a enviar al backend: ', JSON.stringify(this.usuariosASincronizar, null, 2));

    // Usa el tipo genérico RespuestaDTO<string>
    this.colaboradorService.guardarSincronizacion(this.usuariosASincronizar)
        .subscribe({
            next: (response: Respuesta<string>) => {
                const codigo = Number(response.codigoResultado); // Convierte el String a Number para comparar

                if (codigo === 2) {                    
                    this.mostrarModalMensaje('Los datos se guardaron exitósamente.'); 
                    this.buscar();
                } else {                
                    this.mostrarModalMensaje('No se pudo realizar la sincronización.'); 
                    console.log('No se pudo realizar la sincronización.' + response.mensajeResultado);
                }
            },
            error: (httpError) => {
                alert(`Ocurrió un error al guardar los datos.`);                
            }
        });

    this.cerrarModalEditarDatosSincronizacion();
}


  cerrarModalEditarDatosSincronizacion(): void {
    this.mostrarModalDatosSincronizacionDetalle = false;
    this.usuariosASincronizar = []; // Limpiar la lista
  }


  /**
   * Getter que devuelve TRUE si al menos un usuario no tiene asignado Equipo o Horario.
   */
  get hayDatosPendientes(): boolean {
    
    return this.usuariosASincronizar.some(u => u.idEquipo === null || u.idHorario === null);    
  }


  // Función para paginación
  irPagina(n: number) {
    if (n < 1 || n > this.totalPaginas) return;
    this.paginaActual = n;
    this.refrescarDatos(); 
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

}
