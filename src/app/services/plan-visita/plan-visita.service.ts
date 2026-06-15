import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Respuesta } from '../../shared/models/respuesta';
import { VisitPlanResponse } from '../../shared/models/visit-plan.model';
import { VisitaMasivaFila } from '../../shared/models/visita-masivo';
import { VisitItemPendingReprogramResponse, VisitItemReassignRequest } from '../../shared/models/visit-item-reprogram.model';
import { environment } from '../../../../src/environments/environment';

@Injectable({
  providedIn: 'root'
})

// [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2025-12-24 16:07 UTC-5 (Lima)][desc: Agrega descarga de plantilla e import masivo de planes de visita desde Excel][obj: PlanVisitaService]
export class PlanVisitaService {

  private readonly API_URL = `${environment.api.baseUrl}/api/visit-plans`;

  constructor(private http: HttpClient) {}

  buscarPlanes(
    idPersona: string | null,
    fecha: string | null,
    pagina: number,
    tamanio: number
  ): Observable<any> {

    let params = new HttpParams()
      .set('pagina', pagina)
      .set('tamanioPagina', tamanio);

    if (idPersona) params = params.set('idPersona', idPersona.toString());
    if (fecha) params = params.set('fechaPlan', fecha);

    return this.http.get(`${this.API_URL}/buscar`, { params });
  }

  createPlan(request: any): Observable<any> {
    return this.http.post<any>(`${this.API_URL}`, request);
  }

  updatePlan(request: any): Observable<any> {
    return this.http.put<any>(`${this.API_URL}`, request);
  }

  descargarPlantillaExcel(): Observable<Blob> {
    return this.http.get(`${this.API_URL}/import/template`, { responseType: 'blob' });
  }

  importarExcel(file: File): Observable<Respuesta<any>> {
    const form = new FormData();
    form.append('file', file);

    return this.http.post<Respuesta<any>>(`${this.API_URL}/import/excel`, form);
  }

  exportarExcel(idEquipo?: string | null, idPersona?: string | null, fechaPlan?: string | null): Observable<Blob> {
    let params = new HttpParams();
    if (idEquipo) params = params.set('idEquipo', idEquipo);
    if (idPersona != null) params = params.set('idPersona', idPersona.toString());
    if (fechaPlan) params = params.set('fechaPlan', fechaPlan);

    return this.http.get(`${this.API_URL}/export/excel`, { params, responseType: 'blob' });
  }


  /**
   * Valida si existe un plan de visita para una persona en una fecha.
   */
  existePlan(
    idPersona: number,
    fechaPlan: string
  ): Observable<boolean> {

    const params = new HttpParams({
      fromObject: {
        idPersona,
        fechaPlan
      }
    });

    return this.http
      .get<Respuesta<unknown>>(`${this.API_URL}/existe`, { params })
      .pipe(
        map(response => response.codigoResultado === '1')
      );
  }


  /**
   * Valida si existe un plan de visita para una persona en una fecha, con id distinto al plan indicado.
   */
  existePlanOtroId(
    idPersona: number,
    fechaPlan: string,
    idPlanExcluido: number
  ): Observable<boolean> {

    const params = new HttpParams({
      fromObject: {
        idPersona,
        fechaPlan,
        idPlanExcluido
      }
    });

    return this.http
      .get<Respuesta<unknown>>(`${this.API_URL}/existe-otro-id`, { params })
      .pipe(
        map(response => response.codigoResultado === '1')
      );
  }


   /**
   * Obtener plan de visitas por ID
   */
   getPlan(planId: number): Observable<VisitPlanResponse> {
    return this.http.get<VisitPlanResponse>(
      `${this.API_URL}/${planId}`
    );
  }


  guardarMasivo(
    usuarioSesion: string,
    visitas: VisitaMasivaFila[]
  ): Observable<any> {

    const payload = {
      usuarioSesion,
      visitas
    };

    return this.http.post(
      `${this.API_URL}/masivo/guardar`,
      payload
    );
  }

  eliminarPlan(id: number): Observable<Respuesta<any>> {
    return this.http.delete<Respuesta<any>>(`${this.API_URL}/eliminar/${id}`);
  }

  // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-21 15:01 UTC-5 (Lima)][desc: Lista visitas pendientes de reprogramar][obj: PlanVisitaService.buscarPendientesReprogramar]
  buscarPendientesReprogramar(
    idPersona: string | null,
    fecha: string | null,
    pagina: number,
    tamanio: number
  ): Observable<any> {
    let params = new HttpParams()
      .set('pagina', pagina)
      .set('tamanioPagina', tamanio);

    if (idPersona != null) params = params.set('idPersona', idPersona.toString());
    if (fecha) params = params.set('fechaPlan', fecha);

    return this.http.get(`${this.API_URL}/pending-reprogramar`, { params });
  }

  // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-21 15:01 UTC-5 (Lima)][desc: Reprograma una visita pendiente en backend][obj: PlanVisitaService.reprogramarPendiente]
  reprogramarPendiente(
    itemId: number,
    request: VisitItemReassignRequest
  ): Observable<Respuesta<VisitItemPendingReprogramResponse>> {
    return this.http.post<Respuesta<VisitItemPendingReprogramResponse>>(
      `${this.API_URL}/pending-reprogramar/${itemId}/reassign`,
      request
    );
  }

  // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-22 08:13 UTC-5 (Lima)][desc: Lista colaboradores con plan por fecha][obj: PlanVisitaService.listarVerificadoresConPlan]
  listarVerificadoresConPlan(
    fecha: string,
    idPersona?: string | null
  ): Observable<any> {
    let params = new HttpParams().set('fechaPlan', fecha);
    if (idPersona != null) params = params.set('idPersona', idPersona.toString());

    return this.http.get(`${this.API_URL}/verificadores-con-plan`, { params });
  }


}
