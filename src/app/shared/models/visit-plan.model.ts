export interface VisitPlanResponse {
    id: number;
    title: string;
    plannedFor: string;
    status: string;
    verifierId: number;
    verifierNombre: string;
    equipoNombre: string;
    idEquipo: number;
    idUsuario: number;
    // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-07 15:32 UTC-5 (Lima)][desc: Coordenadas y fecha de inicio del plan para pintar punto I][obj: VisitPlanResponse start coords]
    startLatitude?: number;
    startLongitude?: number;
    startAt?: string;
    // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-14 11:27 UTC-5 (Lima)][desc: Coordenadas y fecha de fin del plan para pintar punto F][obj: VisitPlanResponse end coords]
    endLatitude?: number;
    endLongitude?: number;
    endAt?: string;
    items: VisitItemResponse[];
  }
  
export interface VisitItemResponse {
    id: number;  
    companyName?: string;
    targetTime?: string;
    orderIndex: number;
    prioridad?: string;
    plantillaPv?: string;    
    state: string;
    startTime: string;
    endTime: string;
    complex?: boolean;
    foundProblem?: boolean;
    problemNote?: string;
    otherInfo?: string;
    direccion?: string;
    // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-07 09:26 UTC-5 (Lima)][desc: Expone coordenadas de destino en frontend web para pintar avance en mapa de seguimiento][obj: VisitItemResponse latitude/longitude]
    latitude?: number;
    longitude?: number;
  }
  
