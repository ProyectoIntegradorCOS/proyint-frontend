import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ImportJobStatus } from '../../shared/models/import-job.model';
import { environment } from '../../../../src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ImportService {

  private readonly API_URL = `${environment.api.baseUrl}/api/import`;

  constructor(private http: HttpClient) {}

  iniciarImportacion(file: File): Observable<number> {

    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<number>(this.API_URL, formData);
  }

  obtenerEstado(jobId: number): Observable<ImportJobStatus> {
    return this.http.get<ImportJobStatus>(`${this.API_URL}/status/${jobId}`);
  }
}