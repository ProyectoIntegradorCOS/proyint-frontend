// [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-21 15:01 UTC-5 (Lima)][desc: Modelos para pendientes de reprogramar en web][obj: VisitItemPendingReprogramResponse]
export interface VisitItemPendingReprogramResponse {
  itemId: number;
  companyName: string;
  direccion: string;
  prioridad: string;
  plantillaPv?: string | null;
  state: string;
  targetTime?: string | null;
  planId: number;
  plannedFor: string;
  verifierId: number;
  verifierNombre: string;
  equipoId?: number | null;
  equipoNombre?: string | null;
}

// [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-21 15:01 UTC-5 (Lima)][desc: Request para reprogramar visitas en web][obj: VisitItemReassignRequest]
export interface VisitItemReassignRequest {
  newVerifierId: number;
  newPlannedFor: string;
  reason?: string | null;
}
