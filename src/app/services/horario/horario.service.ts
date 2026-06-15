import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../src/environments/environment';

export interface Horario {
  id: number;
  nombre: string;
}

@Injectable({
  providedIn: 'root'
})
export class HorarioService {

  private readonly API_URL = `${environment.api.baseUrl}/api/horarios`;

  constructor(private http: HttpClient) { }

  getHorarios(): Observable<Horario[]> {
    return this.http.get<any[]>(this.API_URL).pipe(
      map(response => response.map(h => ({
        id: h.id,
        nombre: h.nombre
      })))
    );
  }
}
