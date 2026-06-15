import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../src/environments/environment';

export interface MetricEventRequest {
  action: string;
  screen: string;
  status?: string;
  durationMs?: number;
  version?: string;
}

@Injectable({
  providedIn: 'root'
})
// [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-23 11:51 UTC-5 (Lima)][desc: Servicio web para enviar métricas al backend][obj: MetricsService]
export class MetricsService {

  private readonly API_URL = `${environment.api.baseUrl}/api/metrics/ui`;

  constructor(private http: HttpClient) {}

  trackEvent(event: MetricEventRequest): void {
    this.http.post(this.API_URL, event).subscribe({
      error: () => {
        // Ignore errors to avoid breaking UX
      }
    });
  }
}
