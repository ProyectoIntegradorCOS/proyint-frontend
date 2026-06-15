import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'estadoItemPlanVisita' })
export class EstadoItemPlanVisitaPipe implements PipeTransform {
  transform(value: string): string {
    switch (value) {
      case 'PENDING': return 'Pendiente';
      case 'PENDING_REPROGRAMAR': return 'Pendiente de reprogramación';
      case 'EN_ROUTE': return 'En ruta';
      case 'ON_SITE': return 'En el destino';
      case 'IN_VISIT': return 'En visita';
      case 'DONE': return 'Completado';
      case 'CANCELLED': return 'Cancelado';
      case 'DELETED': return 'Eliminado';
      default: return value;
    }
  }
}
