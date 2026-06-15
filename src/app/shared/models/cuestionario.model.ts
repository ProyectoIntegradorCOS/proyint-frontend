import { Pregunta } from './pregunta.model';

export interface Cuestionario {
  id: number;
  nombre: string;
  descripcion: string;
  estado: number;
  // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-16 09:59 UTC-5 (Lima)][desc: Soporta MaterialLocalizations para es_PE/es_ES (historial por fecha)][obj: LocationTrackerApp supportedLocales]
  idEquipo?: number | null;
  nombreEquipo?: string | null;
  preguntas?: Pregunta[];
}
