import { Opcion } from './opcion.model';

export interface Pregunta {
  id?: number;
  idCuestionario: number;
  descripcion: string;
  tipo: 'T' | 'N' | 'F' | 'O' | '';
  orden: number;
  obligatorio: 'S' | 'N';
  idSiguientePregunta?: number | null;
  opciones: Opcion[];
}