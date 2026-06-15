export interface ImportJobStatus {
  id: number | null;
  totalFilas: number;
  filasProcesadas: number;
  porcentaje: number;
  estado: 'INICIANDO' | 'ENVIANDO ARCHIVO' | 'PROCESANDO' | 'COMPLETADO' | 'ERROR';
  mensaje?: string;
  horasRestantes: number;
  minutosRestantes: number;
  segundosRestantes: number;
}
