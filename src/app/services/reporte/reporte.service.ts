import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../src/environments/environment';

export interface ReporteProductividad {
  idVerifier: number;
  nombreVerifier: string;
  equipo: string;
  supervisor: string;

  totalVisitas: number;
  completadas: number;
  terminadas: number;
  pendientes: number;
  conProblemas: number;
  complejas: number;

  fechaPlan: string;
  idPlan: number;
  estadoPlan: string
}

@Injectable({
  providedIn: 'root'
})
 
export class ReporteService {

  private http = inject(HttpClient);

  private readonly API_URL = `${environment.api.baseUrl}/api/reportes/productividad`;

  obtenerReporteProductividad(
    idPersona?: string | null,
    fechaInicio?: string | null,  // ISO: 'YYYY-MM-DD'
    fechaFin?: string | null  // ISO: 'YYYY-MM-DD'
  ): Observable<ReporteProductividad[]> {

    let params = new HttpParams();

    if (idPersona) {
      params = params.set('idPersona', idPersona);
    }
    if (fechaInicio) {
      params = params.set('fechaInicio', fechaInicio);
    }
    if (fechaFin) {
      params = params.set('fechaFin', fechaFin);
    }

    //console.log("params: " + JSON.stringify(params,null,2) );

    return this.http.get<ReporteProductividad[]>(this.API_URL, { params });
  }

}
