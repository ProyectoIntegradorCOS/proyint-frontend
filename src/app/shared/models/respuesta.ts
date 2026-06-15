export interface Respuesta<T> {
    codigoResultado: string;
    mensajeResultado: string;
    resultados: T[];
  }
  