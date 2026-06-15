export interface Destino {
  id: number;
  codigo?: string | null;
  nombre: string;
  categoria: string;
  direccion?: string | null;
  departamento?: string | null;
  provincia?: string | null;
  distrito?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  referencia?: string | null;
  zona?: string | null;
  horarios?: string | null;
  contacto?: string | null;
  precision?: string | null; // CONFIRMADO / APROXIMADO
  activo?: boolean;
  ubicabilidadOnp?: string | null;
  estadoOnp?: string | null;
  fechaActualizacionOnp?: string | null;
  usuarioSesion?: string;
  terminalSesion?: string;
}
