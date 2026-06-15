import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { lastValueFrom } from 'rxjs';
import { SessionService, UserSession } from '../../services/session/session.service';
import { EquipoService } from '../../services/equipo/equipo.service';
import { ColaboradorService } from '../../services/colaborador/colaborador.service';
import { PlanVisitaService } from '../../services/plan-visita/plan-visita.service';
import { VisitItemResponse, VisitPlanResponse } from '../../shared/models/visit-plan.model';
import { MetricsService } from '../../services/metrics/metrics.service';
import { environment } from '../../../../src/environments/environment';
import { EstadoItemPlanVisitaPipe } from '../../pipes/EstadoItemPlanVisita.pipe';

import * as L from 'leaflet';

// --- Interfaces ---
interface Equipo {
  id: string;
  nombre: string;
}

interface Persona {
  idUsuario: string;
  usuario: string;
}

interface FeatureCollectionResponse {
  timestampConsulta: string;
  personas: {
    usuario: string;
    data: {
      type: 'FeatureCollection';
      features: GeoJSON.Feature[];
    };
  }[];
}

interface ParsedPoint {
  latlng: L.LatLng;
  id: string;
  tsMs?: number;
  props?: any;
}

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [EstadoItemPlanVisitaPipe],
  templateUrl: './mapa.html',
  styleUrls: ['./mapa.css']
})
export class Mapa implements OnInit, AfterViewInit, OnDestroy {

  private readonly API_URL = `${environment.api.baseUrl}`;

  map?: L.Map;
  mapboxAccessToken = `${environment.mapboxAccessToken}`;
  colores = ['red', 'blue', 'green', 'purple', 'orange', 'brown', 'teal'];

  tiempoRefrescoMs = parseInt(`${environment.mapaMiliSegundosRefresco}`);

  listaEquipos: Equipo[] = [];
  listaPersonas: Persona[] = [];
  personasActivas: { id: string; nombre: string; color: string }[] = [];
  capasPorPersona: Record<string, L.Layer> = {};
  timestampConsulta: string | null = null;
  intervaloActualizacion: any;

  todosLosEquipos = "todos";
  mostrarCarga = false;
  mostrarMensaje = false;
  mensajeTexto = '';
  equipoSeleccionado = 'todos';
  personaSeleccionada = 'todos';
  fechaSeleccionada = '';
  fechaAnteriorSeleccionada = '';
  fechaMaxima = '';
  actualizacionActiva = false;
  ajustarZoom = false;

  esFechaActual: boolean = true;

  //Permisos
  verTodosLosEquipos: boolean = false;  

  fechaActual = this.getFechaActualFormateada();

  // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-07 10:45 UTC-5 (Lima)][desc: Guarda última búsqueda para reiniciar tiempo real sin pulsar Buscar][obj: Mapa last search tracking]  
  private ultimaBusquedaIds: string[] = [];
  private ultimaBusquedaFecha: string | null = null;
  leyendaExpandida = true; // inicia expandida

  personasData: Record<string, {
    layerGroup: L.LayerGroup;
    routeGroup: L.LayerGroup;
    coords: L.LatLng[];            // coords acumuladas
    coordIds: Set<string>;        // para evitar duplicados simples (lat|lng|ts)
    points: { latlng: L.LatLng; id: string; tsMs?: number; props?: any }[];
    polyline?: L.Polyline;
    decorator?: any;
    segmentPolylines?: L.Polyline[];
    segmentDecorators?: any[];
  }> = {};
  // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-07 09:26 UTC-5 (Lima)][desc: Mantiene marcadores de plan y estado completado en mapa de seguimiento][obj: Mapa plan markers]
  planLayer?: L.LayerGroup;
  // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-07 09:45 UTC-5 (Lima)][desc: Guarda items del plan por persona para segmentar recorrido][obj: Mapa plan items map]
  planItemsByPersonaId: Record<string, VisitItemResponse[]> = {};


  constructor(
    private http: HttpClient,
    private sessionService: SessionService,
    private equipoService: EquipoService,
    private colaboradorService: ColaboradorService,
    private planVisitaService: PlanVisitaService,
    private metricsService: MetricsService,
    private estadoItemPlanVisitaPipe: EstadoItemPlanVisitaPipe
  ) {}

  async ngOnInit(): Promise<void>  {
    
    //Permisos
    this.verTodosLosEquipos = this.sessionService.tienePermiso("seguimiento.todoslosequipos");    

    //Configura la fecha actual y maxima
    this.configurarFechas();

    //Esperar carga de equipos
    await this.cargarEquipos();
    
    //Esperar carga de personas
    await this.cargarPersonas();    

    //SOLO después, ejecutar búsqueda inicial
    await this.buscarDatos();
  }

  ngAfterViewInit(): void {    

    this.inicializarMapa();
  }

  ngOnDestroy(): void {
    if (this.intervaloActualizacion) clearInterval(this.intervaloActualizacion);
    if (this.map) this.map.remove();
  }

  
  private inicializarMapa(): void {
  this.map = L.map('map').setView([-12.0464, -77.0428], 13);

  // Crear panes
  this.map.createPane('trackingPane');
  this.map.getPane('trackingPane')!.style.zIndex = '400';
  this.map.createPane('planPane');
  this.map.getPane('planPane')!.style.zIndex = '500';

  const capasBase = {
    'Calles': L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=${this.mapboxAccessToken}`, {
      tileSize: 512, zoomOffset: -1, maxZoom: 19
    }),
    'Satélite': L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=${this.mapboxAccessToken}`, {
      tileSize: 512, zoomOffset: -1, maxZoom: 19
    }),
    'Relieve': L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/{z}/{x}/{y}?access_token=${this.mapboxAccessToken}`, {
      tileSize: 512, zoomOffset: -1, maxZoom: 19
    })
  };

  capasBase.Calles.addTo(this.map);
  L.control.layers(capasBase).addTo(this.map);
}


  mostrarModalMensaje(texto: string): void {
    this.mensajeTexto = texto;
    this.mostrarMensaje = true;
  }

  cerrarModalMensaje(): void {
    this.mostrarMensaje = false;
    this.mensajeTexto = "";
  }

  configurarFechas(): void {    
    this.fechaSeleccionada = this.fechaActual;    
    this.fechaMaxima = this.fechaActual;

    //Guarda el valor anterior
    this.fechaAnteriorSeleccionada = this.fechaSeleccionada;
  }


  async buscarDatos(): Promise<void> {
    const inicio = Date.now();
    const fecha = this.fechaSeleccionada;
    if (!fecha) {
      this.mostrarModalMensaje('⚠️ Seleccione una fecha válida.');
      return;
    }

    this.timestampConsulta = null;
    const seleccionUnica = this.personaSeleccionada;    
    const todos = seleccionUnica === 'todos';
    const ids = todos ? this.listaPersonas.map(p => p.idUsuario) : [seleccionUnica];
    // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-07 10:45 UTC-5 (Lima)][desc: Persistimos ids/fecha para actualizar en tiempo real sin nueva búsqueda][obj: Mapa.buscarDatos last search]
    this.ultimaBusquedaIds = ids.slice();
    this.ultimaBusquedaFecha = fecha;

    if (ids.length === 0 && todos) {
      this.mostrarModalMensaje('⚠️ No hay colaboradores disponibles para buscar.');
      return;
    }

    this.mostrarCarga = true;
    const resultado = await this.cargarDatos(ids.join(','), fecha, true);
    this.mostrarCarga = false;

    const status = resultado === 'error' ? 'error' : (!resultado ? 'empty' : 'success');
    // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-23 11:51 UTC-5 (Lima)][desc: Registra métricas de seguimiento de mapa][obj: Mapa.buscarDatos]
    this.metricsService.trackEvent({
      action: 'seguimiento_buscar',
      screen: 'seguimiento',
      status,
      durationMs: Date.now() - inicio
    });

    if (resultado === 'error') this.mostrarModalMensaje('❌ Error al cargar datos del backend.');
    else if (!resultado) this.mostrarModalMensaje('⚠️ No se encontraron ubicaciones.');

    this.iniciarActualizacionPeriodica(ids, fecha);
  }

  
  private getColorParaPersona(personaId: string, displayName: string): string {
    // Si ya tiene color asignado, mantenerlo
    const existente = this.personasActivas.find(p => p.id === personaId);
    if (existente) return existente.color;
  
    // Asignar nuevo color disponible
    const idx = this.personasActivas.length % this.colores.length;
    const color = this.colores[idx];
  
    // Guardar asignación persistente
    this.personasActivas.push({
      id: personaId,
      nombre: displayName,
      color
    });
  
    return color;
  }


  async cargarDatos(personaIds: string, fecha: string, limpiarMapa = false): Promise<boolean | 'error'> {
    try {
      this.cerrarModalMensaje();

      let url = `${this.API_URL}/api/locations/buscar?persona=${personaIds}&fecha=${fecha}`;
      if (this.timestampConsulta) url += `&timestamp=${encodeURIComponent(this.timestampConsulta)}`;
      
      const data = await lastValueFrom(this.http.get<FeatureCollectionResponse>(url));
      if (!data) return false;
  
      //console.log("cargarDatos(), data: " + JSON.stringify(data,null,2));

      // actualizar timestamp para siguientes consultas
      this.timestampConsulta = data.timestampConsulta;

      //console.log("data.timestampConsulta: " + data.timestampConsulta);
  
      // Si debemos limpiar, remover todo lo mostrado y resetear estructuras
      if (limpiarMapa) {
        Object.values(this.personasData).forEach(pd => {
          this.map?.removeLayer(pd.layerGroup);
          this.map?.removeLayer(pd.routeGroup);
        });
        this.personasData = {};
        this.capasPorPersona = {};
        this.personasActivas = [];
        // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-07 09:26 UTC-5 (Lima)][desc: Limpia marcadores del plan al reiniciar el mapa][obj: Mapa.cargarDatos clear plan]
        this.clearPlanMarkers();
        // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-07 09:45 UTC-5 (Lima)][desc: Limpia cache de plan al reiniciar el mapa de seguimiento][obj: Mapa.cargarDatos clear plan items]
        this.planItemsByPersonaId = {};
      }
  
      const colecciones = data.personas || [];
      const todosLosPuntosNuevos: L.LatLng[] = [];
  
      for (let idx = 0; idx < colecciones.length; idx++) {
        const coleccion = colecciones[idx] as any;
        const usuario = coleccion.usuario || `Usuario ${idx + 1}`;
        const personaKey = (coleccion.user_id ?? usuario).toString();
        const features = coleccion.data?.features || [];
        if (!features.length) continue;
  
        const color = this.getColorParaPersona(personaKey, this.obtenerNombrePersona(personaKey));
  
        // Convertir features a LatLng y generar ids simples para deduplicar
        // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-07 09:55 UTC-5 (Lima)][desc: Tipa puntos parseados para incluir timestamp de tracking][obj: Mapa.cargarDatos parsed points]
        const parsed: ParsedPoint[] = features.map((f: any) => {
          const coords = (f.geometry as any).coordinates.slice().reverse(); // [lat, lng]
          const lat = +coords[0];
          const lng = +coords[1];
          // intentar usar timestamp/fecha/hora si existe, sino usar propiedades combinadas
          const ts = f.properties?.timestamp ?? `${f.properties?.fecha ?? ''}_${f.properties?.hora ?? ''}`;
          const id = `${lat}|${lng}|${ts}`;
          const tsMs = this.parseTrackingTimestamp(f.properties);
          return { latlng: L.latLng(lat, lng), id, props: f.properties, tsMs };
        });
  
        // crear una capa temporal solo con los marcadores nuevos (sin añadir aún)
        const nuevaCapaTemporal = L.layerGroup();        

        parsed.forEach(p => {
          const horaFormateada = this.formatHoraAMPM(p.props?.hora);

          const marker = L.circleMarker(p.latlng, {
            radius: 3,
            color,
            fillColor: color,
            fillOpacity: 0.8
          }).bindPopup(
            `
            <div style="font-family: Arial, sans-serif; font-size:13px; width:300px;">
              <table style="border-collapse: collapse; width:100%;">

                <tr>
                  <td style="width:120px; padding:4px 6px; color:#555;">
                    <strong>👤 Colaborador</strong>
                  </td>
                  <td style="padding:4px 6px;">
                    ${p.props?.nombre ?? ''}
                  </td>
                </tr>

                <tr style="background:#f7f7f7;">
                  <td style="padding:4px 6px; color:#555;">
                    <strong>⏰ Hora</strong>
                  </td>
                  <td style="padding:4px 6px;">
                    ${horaFormateada}
                  </td>
                </tr>

              </table>
            </div>
            `,
            { maxWidth: 420 }
          );

          nuevaCapaTemporal.addLayer(marker);
          todosLosPuntosNuevos.push(p.latlng);
        });
  
        // obtener datos acumulados previos (si existen)
        const pd = this.personasData[personaKey];
  
        if (!pd) {
          // --- Caso: primera vez que vemos a esta persona (o limpiarMapa=true) ---
          const layerGroup = L.layerGroup();
          const routeGroup = L.layerGroup();

          // añadir todos los marcadores temporales
          nuevaCapaTemporal.eachLayer((l: any) => layerGroup.addLayer(l));
  
          // coords iniciales (en orden que vino la respuesta)
          const coordsIniciales = parsed.map(p => p.latlng);
          const puntosIniciales = parsed.map(p => ({
            latlng: p.latlng,
            id: p.id,
            tsMs: p.tsMs,
            props: p.props,
          }));
  
          // polyline si hay más de 1 punto
          let polyline: L.Polyline | undefined;
          let decorator: any;
  
          layerGroup.addTo(this.map!);
          routeGroup.addTo(this.map!);
  
          const coordIds = new Set<string>(parsed.map(p => p.id));
          this.personasData[personaKey] = {
            layerGroup,
            routeGroup,
            coords: coordsIniciales,
            points: puntosIniciales,
            coordIds,
            polyline,
            decorator
          };
          this.updateRouteForPersona(personaKey, color);
  
          // compatibilidad con capasPorPersona y leyenda
          this.capasPorPersona[personaKey] = layerGroup;
          if (!this.personasActivas.find(p => p.id === personaKey)) {
            this.personasActivas.push({ id: personaKey, nombre: this.obtenerNombrePersona(personaKey), color });
          }
        } else {
          // --- Caso: ya existe la persona en pantalla (actualización periódica o parcial) ---
          // Añadir solo marcadores que no estén ya (evitar duplicados)
          const nuevosParsed = parsed.filter(p => !pd.coordIds.has(p.id));
          if (nuevosParsed.length === 0) {
            // nada nuevo para esta persona
            continue;
          }
  
          // Añadir marcadores nuevos a layerGroup existente
          nuevosParsed.forEach(p => {
            const horaFormateada = this.formatHoraAMPM(p.props?.hora);

            const marker = L.circleMarker(p.latlng, {
              radius: 3,
              color,
              fillColor: color,
              fillOpacity: 0.8
            }).bindPopup(
                `
                <div style="font-family: Arial, sans-serif; font-size:13px; width:300px;">
                  <table style="border-collapse: collapse; width:100%;">

                    <tr>
                      <td style="width:120px; padding:4px 6px; color:#555;">
                        <strong>👤 Colaborador</strong>
                      </td>
                      <td style="padding:4px 6px;">
                        ${p.props?.nombre ?? ''}
                      </td>
                    </tr>

                    <tr style="background:#f7f7f7;">
                      <td style="padding:4px 6px; color:#555;">
                        <strong>⏰ Hora</strong>
                      </td>
                      <td style="padding:4px 6px;">
                        ${horaFormateada}
                      </td>
                    </tr>

                  </table>
                </div>
                `,
                { maxWidth: 420 }
              );
            pd.layerGroup.addLayer(marker);
            pd.coordIds.add(p.id);
          });
  
          // Concatenar coords nuevas en el orden reportado (puedes ordenar por timestamp aquí si lo necesitas)
          const nuevasCoords = nuevosParsed.map(p => p.latlng);
          pd.coords = pd.coords.concat(nuevasCoords);
          pd.points = pd.points.concat(
            nuevosParsed.map(p => ({
              latlng: p.latlng,
              id: p.id,
              tsMs: p.tsMs,
              props: p.props,
            })),
          );
  
          // Redibujar / actualizar polyline y decorator:
          this.updateRouteForPersona(personaKey, color);

          // Asegurar que el layerGroup esté en el mapa
          if (!this.map?.hasLayer(pd.layerGroup)) pd.layerGroup.addTo(this.map!);
        }
      } // end for each collection
  
      // Si fue una búsqueda manual (limpiarMapa=true) ajustar bounds con todos los puntos recibidos
      /*
      if (limpiarMapa && todosLosPuntosNuevos.length > 0) {
        const bounds = L.latLngBounds(todosLosPuntosNuevos);
        this.map?.fitBounds(bounds);
      }
      */
  

      // --- Ajustar bounds globales incluyendo todas las personas, solo cuando es busqueda manual o se requiere Zoom automatico ---
      if (limpiarMapa || this.ajustarZoom) {
        try {
          const todasLasCoords: L.LatLng[] = [];
          Object.values(this.personasData).forEach(pd => {
            todasLasCoords.push(...pd.coords);
          });

          if (todasLasCoords.length > 0) {
            const bounds = L.latLngBounds(todasLasCoords);
            this.map?.fitBounds(bounds, { padding: [30, 30] });
          }
        } catch (e) {
          console.warn("Error ajustando bounds globales", e);
        }
      }

      // devolver true si alguna colección tenía features
      // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-07 09:26 UTC-5 (Lima)][desc: Refresca marcadores del plan cuando hay una sola persona seleccionada][obj: Mapa.cargarDatos refresh plan]
      await this.cargarPlanVisitasSeleccionada(fecha);
      return colecciones.some(c => c.data.features.length > 0);
    } catch (err) {
      console.error('cargarDatos error:', err);
      return 'error';
    }
  }
  


  iniciarActualizacionPeriodica(ids: string[], fecha: string): void {
    if (this.intervaloActualizacion) clearInterval(this.intervaloActualizacion);

    if (fecha === this.fechaActual && this.actualizacionActiva) {      

      this.intervaloActualizacion = setInterval(() => {
        void this.cargarDatos(ids.join(','), fecha, false);
      }, this.tiempoRefrescoMs);
    }
  }


  private async cargarPlanVisitasSeleccionada(fecha: string): Promise<void> {
    const personaId = this.personaSeleccionada;
    if (!personaId || personaId === 'todos') {
      this.clearPlanMarkers();
      return;
    }

    const plan = await this.buscarPlanParaPersona(personaId, fecha);

    if (!plan) {
      this.clearPlanMarkers();
      return;
    }
    this.planItemsByPersonaId[personaId] = plan.items ?? [];
    this.renderPlanMarkers(
      plan.items ?? [],
      this.obtenerNombrePersona(personaId),
      plan.startLatitude ?? null,
      plan.startLongitude ?? null,
      plan.endLatitude ?? null,
      plan.endLongitude ?? null,
      plan.startAt ?? null,
      plan.endAt ?? null
    );

    this.updateRouteForPersona(personaId, this.getColorParaPersona(personaId, this.obtenerNombrePersona(personaId)));    
  }


  private updateRouteForPersona(personaId: string, color: string): void {
  const pd = this.personasData[personaId];
  if (!pd || !pd.points || pd.points.length < 2) return;

  this.clearRouteLayers(pd);

  // Filtrar puntos demasiado cercanos (menos de 2 metros)
  const filteredCoords: L.LatLng[] = [];
  let lastAdded: L.LatLng | null = null;
  pd.points.forEach(p => {
    if (!lastAdded || lastAdded.distanceTo(p.latlng) >= 2) {
      filteredCoords.push(p.latlng);
      lastAdded = p.latlng;
    }
  });
  if (filteredCoords.length < 2) return;

  pd.coords = filteredCoords;

  // Dibujar polyline en routeGroup en lugar de layerGroup
  pd.polyline = L.polyline(pd.coords, {
    color,
    weight: 2,
    opacity: 0.8,
    pane: 'trackingPane',
    renderer: L.canvas()
  });
  pd.routeGroup.addLayer(pd.polyline);   // ← CAMBIO: routeGroup

  this.drawArrows(pd, color);
}



private drawArrows(
  pd: { coords: L.LatLng[]; layerGroup: L.LayerGroup; routeGroup: L.LayerGroup },
  arrowColor: string = 'black'
): void {
  const coords = pd.coords;
  if (coords.length < 2) return;

  const distanciaIntervalo = 100; // metros
  const puntosIntervalo = 10;   // puntos
  let distanciaAcumulada = 0;
  let puntosAcumulados = 0;

  const addArrow = (p1: L.LatLng, p2: L.LatLng, size: number) => {
    const midLat = (p1.lat + p2.lat) / 2;
    const midLng = (p1.lng + p2.lng) / 2;
    const mid = L.latLng(midLat, midLng);

    const latRad = (p1.lat * Math.PI) / 180;
    const dx = (p2.lng - p1.lng) * Math.cos(latRad);
    const dy = p2.lat - p1.lat;
    const angleMath = Math.atan2(dy, dx) * (180 / Math.PI);
    const angleCss = 90 - angleMath;

    const icon = this.buildArrowIcon(angleCss, arrowColor, size);
    L.marker(mid, { icon, pane: 'trackingPane', interactive: false }).addTo(pd.routeGroup);
  };

  for (let i = 1; i < coords.length - 1; i++) {
    const segmento = coords[i - 1].distanceTo(coords[i]);
    distanciaAcumulada += segmento;
    puntosAcumulados++;

    if (puntosAcumulados >= puntosIntervalo || distanciaAcumulada >= distanciaIntervalo) {
      addArrow(coords[i], coords[i + 1], 16);
      distanciaAcumulada = 0;
      puntosAcumulados = 0;
    }
  }

  // Flecha final siempre visible
  const last = coords.length - 1;
  if (last >= 1) {
    addArrow(coords[last - 1], coords[last], 20);
  }
}



private buildArrowIcon(angleCss: number, color: string, size: number): L.DivIcon {
  // Flecha SVG apuntando hacia ARRIBA por defecto (north = 0°)
  // Se rota con CSS transform para alinearse con el segmento
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        display: flex;
        align-items: center;
        justify-content: center;
        transform: rotate(${angleCss}deg);
      ">
        <svg xmlns="http://www.w3.org/2000/svg"
             width="${size}" height="${size}"
             viewBox="0 0 100 100">
          <!-- Flecha apuntando hacia arriba -->
          <polygon
            points="50,0 100,100 50,70 0,100"
            fill="${color}"
            opacity="0.9"
          />
        </svg>
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}



  private addDirectionMarker(pd: any, color: string) {

    if (!pd?.points || pd.points.length < 2) return;

    const prev = pd.points[pd.points.length - 2];
    const current = pd.points[pd.points.length - 1];

    if (!prev?.latlng || !current?.latlng) return;

    const prevLatLng = prev.latlng;
    const currLatLng = current.latlng;

    if (
      prevLatLng.lat == null || prevLatLng.lng == null ||
      currLatLng.lat == null || currLatLng.lng == null
    ) {
      console.warn('Punto inválido para flecha', prev, current);
      return;
    }

    const angle = this.getAngleFromLatLng(prevLatLng, currLatLng);

    const icon = L.divIcon({
      className: '',
      html: `
        <div style="
          transform: rotate(${angle}deg);
          font-size:22px;
          color:${color};
          font-weight:bold;
        ">➤</div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const marker = L.marker(currLatLng, { icon });
    pd.layerGroup.addLayer(marker);
  }

  private getAngleFromLatLng(
    prev: L.LatLng,
    current: L.LatLng
  ): number {
    const dy = current.lat - prev.lat;
    const dx = current.lng - prev.lng;

    const theta = Math.atan2(dy, dx);
    return theta * (180 / Math.PI);
  }



 private clearRouteLayers(pd: any): void {
  // ← ANTES limpiaba pd.layerGroup completo, borrando los CircleMarkers
  // Ahora solo limpia la capa de rutas
  if (!pd.routeGroup) {
    pd.routeGroup = L.layerGroup().addTo(this.map!);
  }
  pd.routeGroup.clearLayers();
}


  private async buscarPlanParaPersona(
    personaId: string,
    fecha: string,
  ): Promise<VisitPlanResponse | null> {
    // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-07 09:26 UTC-5 (Lima)][desc: Consulta plan del día para un verificador y retorna el primero encontrado][obj: Mapa.buscarPlanParaPersona]
    try {
      const resp: any = await lastValueFrom(
        this.planVisitaService.buscarPlanes(
          personaId,
          fecha,
          1,
          1,
        ),
      );

      // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-07 09:37 UTC-5 (Lima)][desc: Tolera codigoResultado como string/number al buscar plan de visitas][obj: Mapa.buscarPlanParaPersona]
      if ((resp?.codigoResultado === 1 || resp?.codigoResultado === '1') &&
          Array.isArray(resp.resultados) &&
          resp.resultados.length > 0) {
        return resp.resultados[0] as VisitPlanResponse;
      }
    } catch (error) {
      console.error('Error cargando plan de visitas', error);
    }
    return null;
  }

  
  
  private renderPlanMarkers(
    items: VisitItemResponse[],
    personaNombre: string,
    startLatitude: number | null,
    startLongitude: number | null,
    endLatitude: number | null,
    endLongitude: number | null,
    startTime: string | null,
    endTime: string | null
  ): void {
    this.clearPlanMarkers();
    if (!this.map || items.length === 0) return;

    const layer = L.layerGroup();

    // ✅ CAMBIO: ya NO se ordena, se usa el orden tal como viene del backend
    const ordered = items;

    // ✅ CAMBIO: se usa index para numeración
    ordered.forEach((item, index) => {

      const rawLat = item.latitude ?? (item as any).latitud;
      const rawLng = item.longitude ?? (item as any).longitud;
      const lat = typeof rawLat === 'string' ? Number(rawLat) : rawLat;
      const lng = typeof rawLng === 'string' ? Number(rawLng) : rawLng;

      if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) return;

      // ✅ CAMBIO: se pasa el número calculado (index + 1)
      const marker = L.marker([lat, lng], {
        icon: this.buildPlanIcon(item, index + 1),
        zIndexOffset: 1000
      });

      const estadoTexto = this.estadoItemPlanVisitaPipe.transform(item.state);

      marker.bindPopup(`
        <div style="font-family: Arial, sans-serif; font-size:13px; width:380px;">
          <table style="border-collapse: collapse; width:100%;">
            <tr>
              <td style="width:120px; padding:4px 6px; color:#555;"><strong>👤 Colaborador</strong></td>
              <td style="padding:4px 6px;">${personaNombre}</td>
            </tr>
            <tr style="background:#f7f7f7;">
              <td style="padding:4px 6px; color:#555;"><strong>🏢 Destino</strong></td>
              <td style="padding:4px 6px;">${item.companyName ?? ''}</td>
            </tr>
            <tr>
              <td style="padding:4px 6px; color:#555;"><strong>📍 Dirección</strong></td>
              <td style="padding:4px 6px;">${item.direccion ?? ''}</td>
            </tr>
            <tr style="background:#f7f7f7;">
              <td style="padding:4px 6px; color:#555;"><strong>⚡ Prioridad</strong></td>
              <td style="padding:4px 6px;">${item.prioridad ?? ''}</td>
            </tr>
            <tr>
              <td style="padding:4px 6px; color:#555;"><strong>📊 Estado</strong></td>
              <td style="padding:4px 6px;">${estadoTexto}</td>
            </tr>
            <tr style="background:#f7f7f7;">
              <td style="padding:4px 6px; color:#555;"><strong>🧾 Cód.PV</strong></td>
              <td style="padding:4px 6px;">${item.plantillaPv ?? ''}</td>
            </tr>
          </table>
        </div>
      `, { maxWidth: 420 });

      layer.addLayer(marker);
    });

    // ✅ CAMBIO: se pasa el array original (sin ordenar)
    const startMarker = this.buildPlanStartMarker(ordered, startLatitude, startLongitude);

    if (startMarker) {
      const horaInicio = this.formatHoraLima(startTime);
      
      startMarker.bindPopup(`
          <div style="font-family: Arial, sans-serif; font-size:13px; width:320px;">
            <table style="border-collapse: collapse; width:100%;">
              
              <tr>
                <td style="width:120px; padding:4px 6px; color:#555;"><strong>👤 Colaborador</strong></td>
                <td style="padding:4px 6px;">${personaNombre}</td>
              </tr>

              <tr style="background:#f7f7f7;">
                <td style="padding:4px 6px; color:#555;"><strong>🚩 Tipo</strong></td>
                <td style="padding:4px 6px;">Inicio del recorrido hacia el primer destino</td>
              </tr>

              <tr>
                <td style="width:120px; padding:4px 6px; color:#555;"><strong>⏰ Hora</strong></td>
                <td style="padding:4px 6px;">${horaInicio}</td>
              </tr>            
            </table>
          </div>
        `, { maxWidth: 350 });
      
      layer.addLayer(startMarker);
    }

    const endMarker = this.buildPlanEndMarker(endLatitude, endLongitude);

    if (endMarker) {
      const horaFin = this.formatHoraLima(endTime);
      
      endMarker.bindPopup(`
          <div style="font-family: Arial, sans-serif; font-size:13px; width:320px;">
            <table style="border-collapse: collapse; width:100%;">
              
              <tr>
                <td style="width:120px; padding:4px 6px; color:#555;"><strong>👤 Colaborador</strong></td>
                <td style="padding:4px 6px;">${personaNombre}</td>
              </tr>

              <tr style="background:#f7f7f7;">
                <td style="padding:4px 6px; color:#555;"><strong>🏁 Tipo</strong></td>
                <td style="padding:4px 6px;">Fin de la visita al último destino</td>
              </tr>

              <tr>
                <td style="width:120px; padding:4px 6px; color:#555;"><strong>⏰ Hora</strong></td>
                <td style="padding:4px 6px;">${horaFin}</td>
              </tr>            
            </table>
          </div>
        `, { maxWidth: 350 });

      
      layer.addLayer(endMarker);
    }

    layer.addTo(this.map);
    this.planLayer = layer;
  }



  // ✅ CAMBIO: se agrega parámetro orderNumber
private buildPlanIcon(item: VisitItemResponse, orderNumber: number): L.DivIcon {

    const state = (item.state || '').toUpperCase();

    const palette =
      state === 'DONE'
        ? { bg: '#d4edda', border: '#2e7d32', text: '#2e7d32' }
      : state === 'IN_VISIT'
        ? { bg: '#cfe2ff', border: '#0b5ed7', text: '#0b5ed7' }
      : state === 'ON_SITE'
        ? { bg: '#ffffff', border: '#b26a00', text: '#8a4b00' }
      : state === 'EN_ROUTE'
        ? { bg: '#fff3cd', border: '#b26a00', text: '#8a4b00' }
      : { bg: '#f2f4f8', border: '#7b8794', text: '#52606d' };

    // ✅ CAMBIO: usar orderNumber en lugar de orderIndex
    const label = state === 'DONE'
      ? `Ok ${orderNumber}`
      : `${orderNumber}`;

    const priorityColor = this.getPriorityColor(item.prioridad);

    const style = [
      'width:28px',
      'height:28px',
      'border-radius:50%',
      `background:${palette.bg}`,
      `border:2px solid ${palette.border}`,
      `color:${palette.text}`,
      'font-size:12px',
      'font-weight:700',
      'line-height:24px',
      'text-align:center',
      'box-shadow:0 2px 6px rgba(0,0,0,0.25)',
    ].join(';');

    const priorityRing = priorityColor
      ? `<span style="position:absolute;inset:-4px;border:2px solid ${priorityColor};border-radius:50%;"></span>`
      : '';

    return L.divIcon({
      className: 'plan-marker-wrapper',
      html: `<div class="plan-marker" style="position:relative;${style}">${priorityRing}${label}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  }

  private getPriorityColor(priority?: string): string | null {
    // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-07 14:25 UTC-5 (Lima)][desc: Mapea prioridad a color de anillo en marcadores del plan][obj: Mapa.getPriorityColor]
    const key = (priority || '').toUpperCase();
    if (key.includes('MUY')) return '#c62828';
    if (key.includes('ALTA')) return '#ef6c00';
    if (key.includes('NORMAL')) return '#616161';
    return null;
  }

  private buildPlanStartMarker(
    items: VisitItemResponse[],
    startLatitude: number | null,
    startLongitude: number | null,
  ): L.Marker | null {

    if (!items || items.length === 0) return null;

    // ✅ CAMBIO: se usa el PRIMER elemento tal como viene del backend
    const first = items[0];

    const icon = L.divIcon({
      className: 'plan-marker-wrapper',
      html: '<div style="width:26px;height:26px;border-radius:50%;background:#ffeb3b;border:2px solid #f57f17;color:#1a1a1a;font-weight:700;line-height:22px;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,0.25);">I</div>',
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });

    // si backend manda coordenadas, usar esas
    if (startLatitude != null && startLongitude != null) {
      return L.marker(L.latLng(startLatitude, startLongitude), {
        icon,
        zIndexOffset: 3000
      });
    }

    // fallback: usar coordenadas del primer destino
    const dest = this.getItemLatLng(first);
    if (!dest) return null;

    return L.marker(dest, {
      icon,
      zIndexOffset: 3000
    });
  }


  private buildPlanEndMarker(
    endLatitude: number | null,
    endLongitude: number | null,
  ): L.Marker | null {

    if (endLatitude == null || endLongitude == null) return null;

    const icon = L.divIcon({
      className: 'plan-marker-wrapper',
      html: '<div style="width:26px;height:26px;border-radius:50%;background:#ffeb3b;border:2px solid #f57f17;color:#1a1a1a;font-weight:700;line-height:22px;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,0.25);">F</div>',
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });

    return L.marker(
      L.latLng(endLatitude, endLongitude),
      {
        icon,
        zIndexOffset: 5000
      }
    );
  }

  private findFirstPointAfter(points: { latlng: L.LatLng; tsMs?: number }[], ts: number): number | null {
    // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-07 14:25 UTC-5 (Lima)][desc: Encuentra el primer punto de tracking posterior al timestamp dado][obj: Mapa.findFirstPointAfter]
    const timed = points.filter(p => typeof p.tsMs === 'number') as { latlng: L.LatLng; tsMs: number }[];
    if (timed.length === 0) return null;
    const idx = timed.findIndex(p => p.tsMs >= ts);
    return idx >= 0 ? idx : null;
  }

  private clearPlanMarkers(): void {
  if (this.planLayer && this.map?.hasLayer(this.planLayer)) {
    this.map.removeLayer(this.planLayer);
  }
  this.planLayer = undefined;
}

  private parseTrackingTimestamp(props: any): number | undefined {
    // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-07 09:45 UTC-5 (Lima)][desc: Convierte fecha/hora del tracking a timestamp para segmentar recorridos][obj: Mapa.parseTrackingTimestamp]
    const fecha = props?.fecha;
    const hora = props?.hora;
    if (!fecha || !hora) return undefined;
    const ts = new Date(`${fecha}T${hora}`).getTime();
    if (Number.isNaN(ts)) return undefined;
    return ts;
  }

private drawSingleRoute(
  pd: { coords: L.LatLng[]; layerGroup: L.LayerGroup; polyline?: L.Polyline },
  color: string
): void {
  if (pd.coords.length <= 1) return;

  pd.polyline = L.polyline(pd.coords, {
    color,
    weight: 4,
    opacity: 0.85,
    renderer: L.canvas()
  });
  pd.layerGroup.addLayer(pd.polyline);

  const pointsInterval = 20; // Ahora cada 20 puntos

  // Flechas intermedias
  for (let i = pointsInterval; i < pd.coords.length; i += pointsInterval) {
    const prev = pd.coords[i - 1];
    const current = pd.coords[i];
    const angle = this.getAngle(prev, current);

    const arrowIcon = L.divIcon({
      className: '',
      html: `<div style="
        transform: rotate(${angle}deg);
        font-size:16px;
        color:${color};
        font-weight:bold;
      ">➤</div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    pd.layerGroup.addLayer(L.marker(current, { icon: arrowIcon }));
  }

  // Flecha final
  const lastIndex = pd.coords.length - 1;
  if (lastIndex > 0) {
    const prev = pd.coords[lastIndex - 1];
    const last = pd.coords[lastIndex];
    const angle = this.getAngle(prev, last);

    const finalArrow = L.divIcon({
      className: '',
      html: `<div style="
        transform: rotate(${angle}deg);
        font-size:18px;
        color:${color};
        font-weight:bold;
      ">➤</div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    pd.layerGroup.addLayer(L.marker(last, { icon: finalArrow }));
  }
}


  private clearTrackingMarkers(pd: { layerGroup: L.LayerGroup }): void {
    // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-07 13:12 UTC-5 (Lima)][desc: Oculta marcadores de puntos de tracking cuando se muestran segmentos de ruta][obj: Mapa.clearTrackingMarkers]
    pd.layerGroup.eachLayer((layer: any) => {
      if (layer instanceof L.CircleMarker) {
        pd.layerGroup.removeLayer(layer);
      }
    });
  }
 
  private buildSegments(
    points: { latlng: L.LatLng; tsMs?: number }[],
    items: VisitItemResponse[],
  ): L.LatLng[][] {
    // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-07 12:54 UTC-5 (Lima)][desc: Segmenta usando puntos con timestamp si existen; si no, usa todos los puntos y proximidad a destinos][obj: Mapa.buildSegments]
    if (points.length < 2) return [points.map(p => p.latlng)];
    const timedPoints = points.filter(p => typeof p.tsMs === 'number') as { latlng: L.LatLng; tsMs: number }[];
    const pointsForSegments: { latlng: L.LatLng; tsMs?: number }[] =
      timedPoints.length >= 2 ? timedPoints : points;

    const completed = items
      .filter(i => (i.state || '').toUpperCase() === 'DONE' && i.endTime)
      .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    if (completed.length === 0) return [points.map(p => p.latlng)];

    const cutIndices: number[] = [];
    let lastIndex = 0;
    completed.forEach((item) => {
      let cut: number | null = null;
      const ts = Date.parse(item.endTime as string);
      if (timedPoints.length >= 2 && !Number.isNaN(ts)) {
        const idx = pointsForSegments.findIndex(p => (p.tsMs ?? 0) >= ts);
        cut = idx === -1 ? pointsForSegments.length - 1 : idx;
      } else {
        const dest = this.getItemLatLng(item);
        if (dest) {
          const nearest = this.findNearestPointIndex(pointsForSegments, dest);
          if (nearest != null) cut = nearest;
        }
      }
      if (cut != null && cut > lastIndex) {
        cutIndices.push(cut);
        lastIndex = cut;
      }
    });

    if (cutIndices.length === 0) return [points.map(p => p.latlng)];

    const segments: L.LatLng[][] = [];
    let start = 0;
    cutIndices.forEach((cut) => {
      const slice = pointsForSegments.slice(start, cut + 1).map(p => p.latlng);
      if (slice.length > 1) segments.push(slice);
      start = cut;
    });
    const tail = pointsForSegments.slice(start).map(p => p.latlng);
    if (tail.length > 1) segments.push(tail);
    return segments.length ? segments : [points.map(p => p.latlng)];
  }

  private getItemLatLng(item: VisitItemResponse): L.LatLng | null {
    // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-07 12:57 UTC-5 (Lima)][desc: Obtiene lat/lng del item con soporte legacy][obj: Mapa.getItemLatLng]
    const rawLat = item.latitude ?? (item as any).latitud;
    const rawLng = item.longitude ?? (item as any).longitud;
    const lat = typeof rawLat === 'string' ? Number(rawLat) : rawLat;
    const lng = typeof rawLng === 'string' ? Number(rawLng) : rawLng;
    if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
      return null;
    }
    return L.latLng(lat, lng);
  }

  private findNearestPointIndex(points: { latlng: L.LatLng }[], target: L.LatLng): number | null {
    // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-07 12:57 UTC-5 (Lima)][desc: Busca el índice del punto más cercano al destino][obj: Mapa.findNearestPointIndex]
    let bestIdx = -1;
    let bestDist = Number.POSITIVE_INFINITY;
    points.forEach((p, idx) => {
      const d = p.latlng.distanceTo(target);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = idx;
      }
    });
    return bestIdx >= 0 ? bestIdx : null;
  }


  onFechaChange(valor: string): void {
    
    if (!valor) {
      //Si el usuario borra la fecha entonces restaurar el valor anterior despues del ciclo del navegador
      setTimeout(() => {
        this.fechaSeleccionada = this.fechaAnteriorSeleccionada;
      });
      //Se retorna para evitar que el nuevo valor anterior sea vacio
      return;
    }

    //Evalua si la fecha seleccionada es la fecha actual
    this.esFechaActual = this.fechaSeleccionada === this.fechaActual;

    //Limpiar el checkbox de refresh porque depende de la fecha
    this.actualizacionActiva = false;

    //Guarda el valor anterior
    this.fechaAnteriorSeleccionada = this.fechaSeleccionada;

    //Luego de cambiar un filtro la busqueda se vuelve a ejecutar.
    this.buscarDatos();
  }
  

  limpiarFiltros() {
    this.equipoSeleccionado = "todos";
    this.personaSeleccionada = "todos";
    this.fechaSeleccionada = this.fechaActual;
    this.actualizacionActiva = false;
    this.ajustarZoom = false;    

    //Guarda el valor anterior
    this.fechaAnteriorSeleccionada = this.fechaSeleccionada;

    this.buscarDatos();
  }


  async onEquipoChange() {

    const session = this.sessionService.getSession();    

    if (this.equipoSeleccionado === "todos") {
        await this.cargarPersonas();      
    }
    else {
        await this.cargarPersonasEquipo(this.equipoSeleccionado);
    }

    //Luego de cambiar un filtro la busqueda se vuelve a ejecutar.
    this.buscarDatos();
  }


  async cargarEquipos(): Promise<void> {

    const session = this.sessionService.getSession();

    if(this.verTodosLosEquipos) {
      await this.cargarEquiposTodos();
    }
    else {
      //Este bloque es valido cuando se desea filtrar los equipos y las personas que son supervisadas por el usuario de la sesion.
      //console.log("session: " + JSON.stringify(session, null, 2));

      if (session?.idUsuario) {      
        await this.cargarEquiposUsuario(session.idUsuaSist);
      }
      else {
        this.mostrarModalMensaje('⚠️ No se pudo obtener la sesión del usuario.');
      }
    }
  }

  async cargarEquiposTodos(): Promise<void> {

    this.mostrarCarga = true;

    try {
      const data: any = await lastValueFrom(this.equipoService.listarActivos());
      this.listaEquipos = data.resultados || [];

      this.mostrarCarga = false;
      //console.log('Equipos:', data.resultados);

    } catch (error) {
      this.mostrarCarga = false;
      console.error('Error cargando todos los equipos', error);
      this.listaEquipos = [];
    }
  }

  async cargarEquiposUsuario(idUsuario: string | number): Promise<void> {

    this.mostrarCarga = true;
    try {
      const data: any = await lastValueFrom(this.equipoService.listarSupervisadosPorusuario(idUsuario));
      this.listaEquipos = data.resultados || [];

      this.mostrarCarga = false;
      //console.log('Equipos:', data.resultados);

    } catch (error) {
      this.mostrarCarga = false;
      console.error('Error cargando equipos', error);
      this.listaEquipos = [];
    }
  }

  
  async cargarPersonas(): Promise<void> {

    const session = this.sessionService.getSession();

    if(this.verTodosLosEquipos) {
      await this.cargarPersonasCampoTodas();
    }
    else {
      //Este bloque es valido cuando se desea filtrar las personas que son supervisadas por el usuario de la sesion.
      if (session?.idUsuario) {      
        await  this.cargarPersonasUsuario(session.idUsuaSist);
      }
      else {
        this.mostrarModalMensaje('⚠️ No se pudo obtener la sesión del usuario.');
      }
    }
  }
 
  async cargarPersonasCampoTodas(): Promise<void> {
    this.mostrarCarga = true;

    try {
      const response = await lastValueFrom(
        this.http.get<any>(`${this.API_URL}/api/users/personas/campo`)        
      );
  
      // El backend devuelve: { codigoResultado, mensajeResultado, resultados: [...] }
      if (response && Array.isArray(response.resultados)) {
        this.listaPersonas = response.resultados.map((p: any) => ({
          idUsuario: p.id.toString(),
          usuario: p.nombre
        }));

        //Selecciona el primer elemento de la lista
        this.personaSeleccionada = "todos";
      } else {
        this.listaPersonas = [];
        this.mostrarModalMensaje('⚠️ No se encontraron personas disponibles.');
      }
    } catch (error) {
      console.error('Error al cargar personas:', error);
      this.mostrarModalMensaje('⚠️ No se pudo cargar la lista de personas.');
    } finally {
      this.mostrarCarga = false;
    }
  }

  async cargarPersonasUsuario(idUsuario: string | number): Promise<void> {
    this.mostrarCarga = true;
    
    try {
      const params = new HttpParams()
        .set('idSupervisor', idUsuario.toString());

      const response = await lastValueFrom(
        this.http.get<any>(`${this.API_URL}/api/users/supervisados`, { params })
      );
  
      // El backend devuelve: { codigoResultado, mensajeResultado, resultados: [...] }
      if (response && Array.isArray(response.resultados)) {
        this.listaPersonas = response.resultados.map((p: any) => ({
          idUsuario: p.id.toString(),
          usuario: p.nombre
        }));

        //Selecciona el primer elemento de la lista
        this.personaSeleccionada = "todos";
      } else {
        this.listaPersonas = [];
        this.mostrarModalMensaje('⚠️ No se encontraron personas disponibles.');
      }
    } catch (error) {
      console.error('Error al cargar personas:', error);
      this.mostrarModalMensaje('⚠️ No se pudo cargar la lista de personas.');
    } finally {
      this.mostrarCarga = false;
    }
  }

  async cargarPersonasEquipo(idEquipo: string | number): Promise<void> {
    this.mostrarCarga = true;
    try {
      const response = await lastValueFrom(
        this.http.get<any>(`${this.API_URL}/api/users/personas/equipo?idEquipo=${idEquipo}`)
      );
  
      // El backend devuelve: { codigoResultado, mensajeResultado, resultados: [...] }
      if (response && Array.isArray(response.resultados)) {
        this.listaPersonas = response.resultados.map((p: any) => ({
          idUsuario: p.id.toString(),
          usuario: p.nombre
        }));

        //Selecciona el primer elemento de la lista
        this.personaSeleccionada = "todos";
      } else {
        this.listaPersonas = [];
        this.mostrarModalMensaje('⚠️ No se encontraron personas disponibles.');
      }
    } catch (error) {
      console.error('Error al cargar personas:', error);
      this.mostrarModalMensaje('⚠️ No se pudo cargar la lista de personas.');
    } finally {
      this.mostrarCarga = false;
    }
  }


private getAngle(p1: L.LatLng, p2: L.LatLng): number {
  const dx = p2.lng - p1.lng;
  const dy = p2.lat - p1.lat;
  const theta = Math.atan2(dy, dx);
  return theta * (180 / Math.PI);
}

  private getFechaActualFormateada(): string {
    const today = new Date();
    // Obtener año, mes y día
    const yyyy = today.getFullYear();
    // Se usa padStart(2, '0') para asegurar dos dígitos (ej: 09 en lugar de 9)
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // Los meses van de 0 a 11
    const dd = String(today.getDate()).padStart(2, '0');
    
    return `${yyyy}-${mm}-${dd}`;
  }

  
  onCambioCheckRefresh() {
    //Limpiar siempre el checkbox de zoom porque  depende del check de refresh.
    this.ajustarZoom = false;

    //Luego de cambiar un filtro la busqueda se vuelve a ejecutar.
    this.buscarDatos();
  }

  onCambioCheckZoom() {

    //Luego de cambiar este filtro la busqueda se vuelve a ejecutar, en este caso solo cuando se marca.
    if(this.ajustarZoom) {
      this.buscarDatos();
    }
  }

  onPersonaChange() {

    //Luego de cambiar un filtro la busqueda se vuelve a ejecutar.
    this.buscarDatos();
  }


  bloquearTeclado(event: KeyboardEvent): void {
    event.preventDefault();
  }


  private formatHoraAMPM(hora: string | null | undefined): string {
    if (!hora) return '';

    const [h, m] = hora.split(':').map(Number);

    const periodo = h >= 12 ? 'p.m.' : 'a.m.';
    const hora12 = h % 12 || 12;

    return `${hora12}:${m.toString().padStart(2, '0')} ${periodo}`;
  }


  private formatHoraLima(isoDate: string | null | undefined): string {
    if (!isoDate) return '';

    const date = new Date(isoDate);

    return new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  }


  private obtenerNombrePersona(id: string): string {
    const p = this.listaPersonas.find(x => x.idUsuario === id);
    return p?.usuario ?? id;
  }

  toggleLeyenda() {
    this.leyendaExpandida = !this.leyendaExpandida;
  }

}
