import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Equipo } from '../../shared/models/equipo';
import { Respuesta } from '../../shared/models/respuesta';
import { environment } from '../../../../src/environments/environment';

// Interfaz simple para los datos que esperamos recibir del backend
interface EquipoListaResponse {
    codigoResultado: number;
    mensajeResultado: string;
    resultados: {
        id: number;
        nombre: string;
    }[];
}

export interface EquipoResultado {
  id: number;
  nombre: string;
  supervisorId: number | null;
  supervisorNombre: string | null;
  realizaVisitas: boolean;
  cuestionarioNombre: string | null;
}

export interface EquipoBusquedaResponse {
  codigoResultado: number;
  mensajeResultado: string;
  resultados: EquipoResultado[];
  paginaActual: number;
  totalPaginas: number;
  tamanioPagina: number;
  totalRegistros: number;
}


@Injectable({
  providedIn: 'root'
})
export class EquipoService {

  private readonly API_URL = `${environment.api.baseUrl}/api/equipo`;

  // Inyección del HttpClient
  private http = inject(HttpClient);

  /**
   * Obtiene la lista de equipos activos para ser mostrados en un desplegable.
   * El endpoint debe ser simple y ligero.
   * @returns Un Observable con la respuesta que contiene la lista de equipos.
   */
  listarActivos(): Observable<EquipoListaResponse> {
    // 🔔 NOTA: Si tu endpoint requiere parámetros (ej. /equipo/activos), ajústalo aquí.
    return this.http.get<EquipoListaResponse>(`${this.API_URL}/lista-activa`);
  }

  
  listarSupervisadosPorusuario(idUsuario: string | number): Observable<EquipoListaResponse> {
    return this.http.get<EquipoListaResponse>(`${this.API_URL}/supervisados/${idUsuario}`);
  }
  

  buscarEquipos(
                nombreEquipo?: string,
                nombreSupervisor?: string,
                pagina: number = 1,
                tamanioPagina: number = 10,
                orden?: string,
                columnaOrden?: string
              ): Observable<EquipoBusquedaResponse> 
  {

    let params = new HttpParams()
      .set("pagina", pagina)
      .set("tamanioPagina", tamanioPagina);

    if (nombreEquipo) params = params.set("nombreEquipo", nombreEquipo);
    if (nombreSupervisor) params = params.set("nombreSupervisor", nombreSupervisor);
    if (orden) params = params.set("orden", orden);
    if (columnaOrden) params = params.set("columnaOrden", columnaOrden);

    return this.http.get<EquipoBusquedaResponse>(`${this.API_URL}/buscar`, { params });
  }

  buscarPorNombre(nombreEquipo?: string): Observable<Respuesta<Equipo>> 
  {
    let params = new HttpParams()

    if (nombreEquipo) params = params.set("nombreEquipo", nombreEquipo);

    return this.http.get<Respuesta<Equipo>>(`${this.API_URL}/buscar-por-nombre`, { params });
  }

  buscarPorNombreOtroId(nombreEquipo?: string, idEquipo?: number): Observable<Respuesta<Equipo>> 
  {
    let params = new HttpParams()

    if (nombreEquipo) params = params.set("nombreEquipo", nombreEquipo);
    if (idEquipo) params = params.set("idEquipo", idEquipo);

    return this.http.get<Respuesta<Equipo>>(`${this.API_URL}/buscar-por-nombre-otro-id`, { params });
  }


   /**
   * Registrar un nuevo equipo
   * POST /equipos
   */
   registrarEquipo(equipo: Equipo): Observable<Respuesta<Equipo>> {
    return this.http.post<Respuesta<Equipo>>(
      `${this.API_URL}/registrar`,
      equipo
    );
  }

  /**
   * Actualizar un equipo existente
   * PUT /equipos/{id}
   */
  actualizarEquipo(equipo: Equipo): Observable<Respuesta<Equipo>> {
    return this.http.put<Respuesta<Equipo>>(
      `${this.API_URL}/actualizar`,
      equipo
    );
  }


  eliminarEquipo(id: number): Observable<Respuesta<any>> {
    return this.http.delete<Respuesta<any>>(`${this.API_URL}/eliminar/${id}`);
  }


  
}
