import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../src/environments/environment';
import { HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly API_URL = `${environment.api.baseUrl}/api/auth`;
  private readonly BFF_SECRET = `${environment.bffSecret}`;

  constructor(private http: HttpClient) {}

  /**
   * Genera un token de sesión a partir de la semilla.
   * @param semilla Cadena de semilla.
   * @returns Observable con la respuesta del backend.
   */
  /*
  generarToken(semilla: string): Observable<any> {
    const body = { semilla };
    return this.http.post<any>(`${this.API_URL}/token`, body);
  }
    */

  generarToken(semilla: string): Observable<any> {
  const body = { semilla };

  const headers = new HttpHeaders({
    'X-BFF-Secret': `${this.BFF_SECRET}`
  });

  return this.http.post<any>(
    `${this.API_URL}/token`,
    body,
    { headers }
  );
}


  /**
   * 🔐 Cierra la sesión del usuario en el backend.
   * Esta petición pasará automáticamente por el interceptor, que agregará el token.
   */
  logout(): Observable<any> {
    console.log('🚪 [AuthService] Llamando a logout');
    // No pasar headers manuales; interceptor se encargará del Authorization
    return this.http.post<any>(`${this.API_URL}/logout`, null);
  }
}
