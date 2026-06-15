export interface Equipo {
    id?: number;
    nombre: string;
    idCuestionario: number | null;
    supervisorId: number | null;
    usuarioSesion?: string;
    realizaVisitas: boolean;
  }
   