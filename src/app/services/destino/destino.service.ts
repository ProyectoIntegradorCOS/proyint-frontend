import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Destino } from '../../shared/models/destino';
import { Respuesta } from '../../shared/models/respuesta';
import { environment } from '../../../../src/environments/environment';

export interface DestinoResultado {
  id: number;
  nombre: string;
  categoria: string;
  direccion?: string | null;
  departamento?: string | null;
  provincia?: string | null;
  distrito?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  referencia?: string | null;
  zona?: string | null;
  horarios?: string | null;
  contacto?: string | null;
  precision?: string | null;
  activo?: boolean;
  ubicabilidadOnp?: string | null;
  estadoOnp?: string | null;
  fechaActualizacionOnp?: string | null; 
}

export interface DestinoBusquedaResponse {
  codigoResultado: number;
  mensajeResultado: string;
  resultados: DestinoResultado[];
  paginaActual: number;
  totalPaginas: number;
  tamanioPagina: number;
  totalRegistros: number;
}


@Injectable({
  providedIn: 'root'
})
export class DestinoService {
  private readonly API_URL = `${environment.api.baseUrl}/api/destinos`;    

  private http = inject(HttpClient);

  buscarDestinos(
    filtroDestino?: string,
    filtroDireccion?: string,
    pagina: number = 1,
    tamanioPagina: number = 10,
    orden?: string,
    columnaOrden?: string
  ): Observable<DestinoBusquedaResponse> {

    let params = new HttpParams().set('pagina', pagina).set('tamanioPagina', tamanioPagina);

    if (filtroDestino) params = params.set('destino', filtroDestino);
    if (filtroDireccion) params = params.set('direccion', filtroDireccion);
    if (orden) params = params.set('orden', orden);
    if (columnaOrden) params = params.set('columnaOrden', columnaOrden);
    
    return this.http.get<DestinoBusquedaResponse>(`${this.API_URL}/buscar`, { params });
  }

  registrarDestino(destino: Destino): Observable<Respuesta<Destino>> {
    return this.http.post<Respuesta<Destino>>(`${this.API_URL}/registrar`, destino);
  }

  actualizarDestino(destino: Destino): Observable<Respuesta<Destino>> {
    return this.http.put<Respuesta<Destino>>(`${this.API_URL}/actualizar`, destino);
  }

  eliminarDestino(id: number): Observable<Respuesta<unknown>> {
    return this.http.delete<Respuesta<unknown>>(`${this.API_URL}/eliminar/${id}`);
  }




  geocode(query: string): Observable<Respuesta<{ placeId: string; label: string; lat: number; lng: number }>> {
    const params = new HttpParams().set('query', query);
    return this.http.get<Respuesta<{ placeId: string; label: string; lat: number; lng: number }>>(
      `${this.API_URL}/geocode`,
      { params }
    );
  }

  reverseGeocode(lat: number, lng: number): Observable<Respuesta<{
    placeId: string;
    label: string;
    direccion: string;
    departamento?: string | null;
    provincia?: string | null;
    distrito?: string | null;
    lat: number;
    lng: number;
  }>> {
    const params = new HttpParams().set('lat', lat.toString()).set('lng', lng.toString());
    return this.http.get<Respuesta<{
      placeId: string;
      label: string;
      direccion: string;
      departamento?: string | null;
      provincia?: string | null;
      distrito?: string | null;
      lat: number;
      lng: number;
    }>>(`${this.API_URL}/reverse-geocode`, { params });
  }

  descargarPlantillaExcel(): Observable<Blob> {
    return this.http.get(`${this.API_URL}/import/template`, { responseType: 'blob' });
  }

  // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2025-12-24 16:52 UTC-5 (Lima)][desc: Exporta el catálogo de destinos a Excel con filtros opcionales][obj: DestinoService.exportarExcel]
  exportarExcel(query?: string, categoria?: string, activo?: boolean): Observable<Blob> {
    let params = new HttpParams();
    if (query) params = params.set('query', query);
    if (categoria) params = params.set('categoria', categoria);
    if (activo !== undefined && activo !== null) params = params.set('activo', activo);
    return this.http.get(`${this.API_URL}/export/excel`, { params, responseType: 'blob' });
  }

  obtenerDestinoPorId(id: number): Observable<Respuesta<DestinoResultado>> {
    return this.http.get<Respuesta<DestinoResultado>>(`${this.API_URL}/${id}`);
  }


}
