export interface VisitaMasivaFila {
    colaboradorId: number;
    fecha: string;          // yyyy-MM-dd
    destinoNombre: string;
    direccion: string;
    horaCita?: string;
    prioridad: 'MUY_ALTA' | 'ALTA' | 'NORMAL' | '';
    plantillaPv: string;
    
    destinoId?: number | null; // catálogo

    validado: boolean;
    mensajeValidacion: string;
  }