import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../src/environments/environment';

// Interfaz para el objeto de filtros que se pasa al servicio
interface FiltrosBusqueda {
  nombre: string;
  equipoId: string;
  pagina: string;
  tamanioPagina: string;
  orden: string;
  columnaOrden: string;
}

// Define una interfaz para el DTO de respuesta paginada de Spring Boot
interface RespuestaPaginada<T> {
  codigoResultado: string;
  mensajeResultado: string;
  resultados: T[]; // La lista de ColaboradorDTO
  totalPaginas: number;
  paginaActual: number; // Añadido para reflejar la respuesta del backend
}

// Interfaz de respuesta para la lista de colaboradores/supervisores
interface ColaboradorListaResponse {
  codigoResultado: string;
  mensajeResultado: string;
  resultados: any[]; 
}


//Interfaces para la sincronizacion de datos
export interface UsuarioSaaDTO {
  login: string;
  nombres: string;
  apePaterno: string;
  apeMaterno: string;
  idUsuario: number;
  nombrePerfil: string | null;
}

export interface SincronizacionResponse {
  codigoResultado: string;
  mensajeResultado: string;
  listaUsuariosNuevosSAA: UsuarioSaaDTO[];
  listaUsuariosSAALocalesActivar: UsuarioSaaDTO[];
}

// Interface para el modelo extendido en el frontend
export interface UsuarioSincronizar extends UsuarioSaaDTO {
  tipo: 'NUEVO' | 'REACTIVAR'; // Columna extra para mostrar en la tabla
  idEquipo: number | null;
  idHorario: number | null;
  nombreCompleto: string;  
  }


@Injectable({
  providedIn: 'root' // Esto lo hace disponible en toda la aplicación (Standalone)
})
export class ColaboradorService {

  private readonly API_URL = `${environment.api.baseUrl}/api/users`;
  

  // Usamos 'inject' para obtener la instancia de HttpClient (práctica moderna)
  private http = inject(HttpClient); 
  
  
  // --- MÉTODOS CRUD ---
  
  /**
   * Registra un nuevo colaborador (POST)
   */
  registrar(colaborador: any): Observable<any> {
    return this.http.post(`${this.API_URL}/by-colaborador`, colaborador);
  }

  /**
   * Actualiza un colaborador existente.
   */
  actualizar(id: number, colaborador: any): Observable<any> {
    return this.http.post(`${this.API_URL}/by-colaborador`, colaborador);
  }





  
  /**
   * 🔎 Obtiene la lista paginada de colaboradores aplicando filtros de búsqueda.
   * La lógica de construcción de parámetros de la URL ha sido movida aquí.
   */
  buscarColaboradores(filtros: FiltrosBusqueda): Observable<RespuestaPaginada<any>> {
    let params = new HttpParams()
        .set('nombre', filtros.nombre)
        .set('equipoId', filtros.equipoId)
        .set('pagina', filtros.pagina)
        .set('tamanioPagina', filtros.tamanioPagina)
        .set('orden', filtros.orden)
        .set('columnaOrden', filtros.columnaOrden);

    return this.http.get<RespuestaPaginada<any>>(`${this.API_URL}/buscar`, { params });
  }

 

  /**
   * 🚀 Obtiene una lista de colaboradores activos de trabajo en campo.
   */
    listarPersonasActivasCampo(): Observable<ColaboradorListaResponse> {
      return this.http.get<ColaboradorListaResponse>(`${this.API_URL}/personas/campo`);
    }

  /**
   * 🚀 Obtiene una lista de colaboradores activos total.
   */
    listarPersonasActivasTotal(): Observable<ColaboradorListaResponse> {
      return this.http.get<ColaboradorListaResponse>(`${this.API_URL}/personas/total`);
    }    

  getPersonasPorEquipo(idEquipo: string): Observable<ColaboradorListaResponse> {
    return this.http.get<ColaboradorListaResponse>(
      `${this.API_URL}/personas/equipo?idEquipo=${idEquipo}`
    );
  }

  // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-21 15:01 UTC-5 (Lima)][desc: Lista colaboradores supervisados para reprogramacion][obj: ColaboradorService.listarSupervisados]
  listarSupervisados(idSupervisor: number | string): Observable<ColaboradorListaResponse> {
    return this.http.get<ColaboradorListaResponse>(
      `${this.API_URL}/supervisados?idSupervisor=${idSupervisor}`
    );
  }

  buscarUsuarioSaa(usuario: string) {
    return this.http.get<any>(`${this.API_URL}/buscar-usuario-saa?usuario=${usuario}`);
  }  

  buscarLogin(login: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/buscar-login?login=${login}`);
  }

  buscarOtroUsuarioIdLogin(id: string, login: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/buscar-otro-usuario-id-login?id=${id}&login=${login}`);
  }





  //Funciones para la sincronización

  
  /**
   * Llama al endpoint para obtener los datos de usuarios a sincronizar.
   */
  obtenerDatosSincronizar(): Observable<SincronizacionResponse> {
    return this.http.get<SincronizacionResponse>(`${this.API_URL}/obtener-datos-sincronizar`);
  }

  
  guardarSincronizacion(usuarios: UsuarioSincronizar[]): Observable<any> {
     return this.http.post(`${this.API_URL}/sincronizar`, usuarios);
  }


}
