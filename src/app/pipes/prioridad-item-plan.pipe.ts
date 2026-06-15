import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'prioridadItemPlan',
  standalone: true
})
export class PrioridadItemPlanPipe implements PipeTransform {

  transform(value: string | null | undefined): string {

    if (!value) {
      return '';
    }

    const prioridad = value.trim();

    switch (prioridad) {
      case 'MUY_ALTA':
        return 'Muy Alta';

      case 'ALTA':
        return 'Alta';

      case 'NORMAL':
        return 'Normal';

      default:
        return prioridad;
    }
  }

}
