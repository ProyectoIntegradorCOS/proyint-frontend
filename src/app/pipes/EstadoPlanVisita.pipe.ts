import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'estadoPlanVisita' })
export class EstadoPlanVisitaPipe implements PipeTransform {
  transform(value: string): string {
    switch (value) {
      case 'PLANNED': return 'Planificado';
      case 'IN_PROGRESS': return 'En proceso';
      case 'COMPLETED': return 'Completado';
      default: return value;
    }
  }
}
