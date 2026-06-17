import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly API_URL = `${environment.api.baseUrl}/api/auth`;

  constructor(private http: HttpClient) {}

  login(usuario: string, clave: string): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/token`, { usuario, clave });
  }

  logout(): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/logout`, null);
  }
}
