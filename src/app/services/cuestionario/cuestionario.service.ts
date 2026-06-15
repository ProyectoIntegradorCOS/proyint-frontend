import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Cuestionario } from '../../shared/models/cuestionario.model';
import { environment } from '../../../../src/environments/environment';

// Interfaz de respuesta para la lista de colaboradores/supervisores
interface CuestionarioListaResponse {
  codigoResultado: string;
  mensajeResultado: string;
  resultados: any[]; 
}

@Injectable({ providedIn: 'root' })
export class CuestionarioService {

  private readonly API_URL = `${environment.api.baseUrl}/api/cuestionarios`;

  constructor(private http: HttpClient) {}

  buscar(nombre: string | null, page: number, size: number): Observable<any> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-16 12:21 UTC-5 (Lima)][desc: Soporta MaterialLocalizations para es_PE/es_ES (historial por fecha)][obj: CuestionarioService.buscar trim]
    const nombreFiltro = nombre?.trim();
    if (nombreFiltro) {
      params = params.set('nombre', nombreFiltro);
    }

    return this.http.get<any>(this.API_URL, { params });
  }

  guardar(cuestionario: Cuestionario): Observable<Cuestionario> {
    return this.http.post<Cuestionario>(this.API_URL, cuestionario);
  }

  actualizar(id: number, cuestionario: Cuestionario): Observable<Cuestionario> {
    return this.http.put<Cuestionario>(`${this.API_URL}/${id}`, cuestionario);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }

  // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-16 10:42 UTC-5 (Lima)][desc: Soporta MaterialLocalizations para es_PE/es_ES (historial por fecha)][obj: CuestionarioService.obtenerActivoPorEquipo]
  obtenerActivoPorEquipo(idEquipo: number): Observable<Cuestionario | null> {
    const params = new HttpParams().set('idEquipo', idEquipo);
    return this.http.get<Cuestionario>(`${this.API_URL}/activo-equipo`, { params });
  }

  listarCuestionarios(): Observable<CuestionarioListaResponse> {
    return this.http.get<CuestionarioListaResponse>(`${this.API_URL}/listar`);
  }
  
}
