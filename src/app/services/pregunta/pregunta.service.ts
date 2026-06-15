import { Injectable} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Pregunta } from '../../shared/models/pregunta.model';
import { environment } from '../../../../src/environments/environment';

@Injectable({ providedIn: 'root' })
export class PreguntaService {
  
  private readonly API_URL = `${environment.api.baseUrl}/api/preguntas`;

  constructor(private http: HttpClient) {}

  listarPorCuestionario(idCuestionario: number) {
  return this.http.get<Pregunta[]>(`${this.API_URL}/cuestionario/${idCuestionario}`);
}

  guardar(p: Pregunta) {
    return this.http.post(this.API_URL, p);
  }

  actualizar(id: number, p: Pregunta) {
    return this.http.put(`${this.API_URL}/${id}`, p);
  }

  eliminar(id: number) {
    return this.http.delete(`${this.API_URL}/${id}`);
  }

  actualizarOrden(preguntas: Pregunta[]) {
    return this.http.put(`${this.API_URL}/orden`, preguntas);
  }

}
