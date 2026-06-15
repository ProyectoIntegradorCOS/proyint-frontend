import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'tipoPregunta' })
export class TipoPreguntaPipe implements PipeTransform {
  transform(value: string): string {
    switch (value) {
      case 'T': return 'Texto';
      case 'N': return 'Número';
      case 'F': return 'Fecha';
      case 'O': return 'Opción múltiple';
      default: return value;
    }
  }
}
