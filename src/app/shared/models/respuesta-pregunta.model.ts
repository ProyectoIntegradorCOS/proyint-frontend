// [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-16 10:42 UTC-5 (Lima)][desc: Soporta MaterialLocalizations para es_PE/es_ES (historial por fecha)][obj: RespuestaPregunta model]
export interface RespuestaPregunta {
  id?: number;
  idPregunta?: number;
  // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-22 09:31 UTC-5 (Lima)][desc: Incluye item de visita y plan para trazabilidad][obj: RespuestaPregunta.idItem/idPlan]
  idItem?: number;
  idPlan?: number;
  textoPregunta: string;
  respuesta: string;
}
