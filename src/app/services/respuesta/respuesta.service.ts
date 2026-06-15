// [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-16 10:42 UTC-5 (Lima)][desc: Soporta MaterialLocalizations para es_PE/es_ES (historial por fecha)][obj: RespuestaService]
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RespuestaPregunta } from '../../shared/models/respuesta-pregunta.model';
import { environment } from '../../../../src/environments/environment';

@Injectable({ providedIn: 'root' })
export class RespuestaService {

  private readonly API_URL = `${environment.api.baseUrl}/api/respuestas`;

  constructor(private http: HttpClient) {}

  // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-16 10:42 UTC-5 (Lima)][desc: Soporta MaterialLocalizations para es_PE/es_ES (historial por fecha)][obj: RespuestaService.obtenerPorCuestionario]
  obtenerPorCuestionario(idCuestionario: number, idPersona: number): Observable<RespuestaPregunta[]> {
    const params = new HttpParams().set('idPersona', idPersona);
    return this.http.get<RespuestaPregunta[]>(`${this.API_URL}/cuestionario/${idCuestionario}`, { params });
  }

  obtenerPorItem(idItem: number): Observable<RespuestaPregunta[]> {
    return this.http.get<RespuestaPregunta[]>(`${this.API_URL}/visit-item/${idItem}`);
  }

}
