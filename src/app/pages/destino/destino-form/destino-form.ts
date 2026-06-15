import { Component, Input, Output, EventEmitter, OnInit, AfterViewInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import * as L from 'leaflet';

import { DestinoService } from '../../../services/destino/destino.service';
import { SessionService } from '../../../services/session/session.service';
import { MapaService } from '../../../services/mapa/mapa.service';
import { Destino } from '../../../shared/models/destino';

@Component({
  selector: 'app-destino-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './destino-form.html',
  styleUrl: './destino-form.css'
})
export class DestinoFormComponent implements OnInit, AfterViewInit {
  @Input() origen: 'BandejaDestinos' | 'BandejaVisitas' = 'BandejaDestinos';
  @Input() modo: 'registro' | 'edicion' = 'registro';
  @Input() destino!: Destino;

  @Output() guardado = new EventEmitter<Destino>();
  @Output() cerrado = new EventEmitter<void>();

  mostrarModalConfirmSinCambioDireccion: boolean = false;
  mostrarModalConfirmConCambioDireccion: boolean = false;
  
  mostrarExito: boolean = false;
  mostrarMensaje: boolean = false;
  mensajeTexto: string = '';

  fechaActual: string = '';

  private map?: L.Map;
  private marker?: L.Marker;
  suggestedLabel: string | null = null;
  private reverseGeocodeTimer?: number;

  readonly categorias = [
    'Ministerio',
    'Municipalidad',
    'Gobierno Regional',
    'Entidad estatal',
    'Empresa privada'
  ];

  //Permisos
  mostrarEditar: boolean = false;

  constructor(
    private destinoService: DestinoService,
    private sessionService: SessionService,
    private mapaService: MapaService,
    private ngZone: NgZone
  ) {}



  ngOnInit(): void {

    //Permisos    
    this.mostrarEditar = this.sessionService.tienePermiso("destinos.editar") || 
                         (this.origen === 'BandejaVisitas' && 
                           (this.sessionService.tienePermiso("visitas.nuevo") || this.sessionService.tienePermiso("visitas.editar"))
                         );

    this.fechaActual =this. getFechaActualFormateada();
    
    this.mapaService.configurarIconoLeaflet();
    
    if (!this.destino.precision) this.destino.precision = 'APROXIMADO';
    if (this.destino.activo === undefined) this.destino.activo = true; 
    
    if(this.modo === 'registro' || !this.destino.ubicabilidadOnp) {
      this.destino.ubicabilidadOnp = "";
    }

    if(this.modo === 'registro' || !this.destino.estadoOnp) {
      this.destino.estadoOnp = "";
    }

    setTimeout(() => {
      const el = document.querySelector('input[name="nombre"]') as HTMLInputElement;
      if (el) el.focus();
    }, 150);
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  private initMap(): void {
    const defaultCenter: L.LatLngExpression = [-12.0464, -77.0428]; // Lima
    const center: L.LatLngExpression =
      this.destino.latitud != null && this.destino.longitud != null
        ? [this.destino.latitud, this.destino.longitud]
        : defaultCenter;

    this.map = L.map('destino-map', { zoomControl: true }).setView(center, 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    if (this.destino.latitud != null && this.destino.longitud != null) {
      this.marker = L.marker([this.destino.latitud, this.destino.longitud], { draggable: true }).addTo(this.map);
      this.marker.on('dragend', () => this.ngZone.run(() => this.syncMarkerToForm()));
    }

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.ngZone.run(() => {
        this.moveMarker(e.latlng.lat, e.latlng.lng);
        this.onUserConfirmedLocation();
      });
    });

  }


  private syncMarkerToForm(): void {
    if (!this.marker) return;
    const pos = this.marker.getLatLng();
    this.destino.latitud = Number(pos.lat.toFixed(6));
    this.destino.longitud = Number(pos.lng.toFixed(6));
    this.destino.precision = 'CONFIRMADO';

    console.log("syncMarkerToForm(), latitud=" + this.destino.latitud + ", longitud=" + this.destino.longitud);
    this.actualizarDireccionDesdeCoordenadas(this.destino.latitud, this.destino.longitud);
  }

  buscarDireccion(): void {
    const query = this.buildGeocodeQuery();
    if (!query) {
      this.mostrarModalMensaje('Ingrese la dirección para buscar.');
      return;
    }

    this.destinoService.geocode(query).subscribe({
      next: resp => {

        //console.log("buscarDireccion(), resp: " + JSON.stringify(resp,null,2));


        if (resp.codigoResultado === '1' && Array.isArray(resp.resultados) && resp.resultados.length > 0) {
          const s = resp.resultados[0];
          //this.suggestedLabel = s.label || null;

          // Posicionar el mapa (SIN reverse geocoding)
          this.moveMarker(s.lat, s.lng);

          // Marcar como aproximado
          this.destino.precision = 'APROXIMADO';

        } else {
          this.suggestedLabel = null;
          this.mostrarModalMensaje(resp?.mensajeResultado || 'No se encontró la dirección en Mapbox.');
        }        
      },
      error: err => {
        console.error('Error geocoding:', err);
        this.suggestedLabel = null;
        this.mostrarModalMensaje('Error consultando Mapbox (geocode).');
      }
    });

  }

  private buildGeocodeQuery(): string | null {
    const parts = [
      this.destino.direccion,
      this.destino.distrito,
      this.destino.provincia,
      this.destino.departamento,
      'Perú'
    ]
      .map(p => (typeof p === 'string' ? p.trim() : ''))
      .filter(Boolean);
    return parts.length ? parts.join(', ') : null;
  }

  private actualizarDireccionDesdeCoordenadas(lat: number | null | undefined, lng: number | null | undefined): void {
    
    console.log("actualizarDireccionDesdeCoordenadas(), lat=" + lat + ", lng=" + lng);

    if (lat == null || lng == null) return;

    // evita spamear la API cuando se arrastra el pin
    if (this.reverseGeocodeTimer) {
      window.clearTimeout(this.reverseGeocodeTimer);
    }
    this.reverseGeocodeTimer = window.setTimeout(() => {
      this.destinoService.reverseGeocode(lat, lng).subscribe({
        next: resp => {
          if (resp.codigoResultado !== '1' || !resp.resultados?.length) return;
          const r = resp.resultados[0] as any;
          const direccion = (r.direccion || r.label || '').toString().trim();
          if (direccion) {
            //this.destino.direccion = direccion;
            this.suggestedLabel = r.label || direccion;
          }
          if (!this.destino.departamento && r.departamento) this.destino.departamento = r.departamento;
          if (!this.destino.provincia && r.provincia) this.destino.provincia = r.provincia;
          if (!this.destino.distrito && r.distrito) this.destino.distrito = r.distrito;
          
          /*
          console.log('[Destino] reverse-geocode:', {
            lat,
            lng,
            direccion: this.destino.direccion,
            departamento: this.destino.departamento,
            provincia: this.destino.provincia,
            distrito: this.destino.distrito
          });
          */

        },
        error: err => {
          console.error('Error reverse-geocoding:', err);
        }
      });
    }, 300);
  }

  validarYConfirmar(): void {
    if (!this.destino.nombre?.trim()) {
      return this.mostrarModalMensaje('El nombre es obligatorio.');
    }

    if (!this.destino.direccion?.trim()) {
      return this.mostrarModalMensaje('La dirección es obligatoria.');
    }    

    /*
    if (!this.destino.categoria?.trim()) {
      return this.mostrarModalMensaje('La categoría es obligatoria.');
    } 
      */   

    if (!this.tieneCoordenadasValidas()) {
      return this.mostrarModalMensaje('Busque la dirección para  obtener las coordenadas o seleccione el punto en el mapa.');
    }    
    
    //Si se modificó la ubicacion en el mapa solicitar confirmacion indicando el detalle
    if (
        this.suggestedLabel != null &&
        this.suggestedLabel.trim() !== '' &&
        this.suggestedLabel.toUpperCase() !== this.destino.direccion.toUpperCase()
       ) {
      this.mostrarModalConfirmConCambioDireccion = true;
    }
    else {
      //Solicitar la conformacion normal, sin detalle
      this.mostrarModalConfirmSinCambioDireccion = true;
    }
  }

  aceptarGuardarSinCambioDireccion(): void {
    this.mostrarModalConfirmSinCambioDireccion = false;
    this.guardar();
  }

  cancelarGuardarSinCambioDireccion(): void {
    this.mostrarModalConfirmSinCambioDireccion = false;
  }

  aceptarGuardarConCambioDireccionSi(): void {
    this.mostrarModalConfirmConCambioDireccion = false;
    this.destino.direccion = this.suggestedLabel;
    this.guardar();
  }

  aceptarGuardarConCambioDireccionNo(): void {
    this.mostrarModalConfirmConCambioDireccion = false;    
    this.guardar();
  }

  cancelarGuardarConCambioDireccion(): void {
    this.mostrarModalConfirmConCambioDireccion = false;
  }


  private guardar(): void {
    this.destino.usuarioSesion = this.sessionService.getSession()?.usuario;
    const request$ =
      this.modo === 'registro' ? this.destinoService.registrarDestino(this.destino) : this.destinoService.actualizarDestino(this.destino);

    request$.subscribe({
      next: resp => {
        if (resp && resp.codigoResultado === '2') {
          this.mostrarExito = true;
        } else {
          this.mostrarModalMensaje('No se pudo realizar la operación.');
        }
      },
      error: err => {
        console.error('Error HTTP:', err);
        this.mostrarModalMensaje('Error de comunicación con el servidor.');
      }
    });
  }

  cerrar(): void {
    this.cerrado.emit();
  }

  cerrarModalExito(): void {
    this.mostrarExito = false;
    this.guardado.emit(this.destino);
  }

  mostrarModalMensaje(texto: string): void {
    this.mensajeTexto = texto;
    this.mostrarMensaje = true;
  }

  cerrarModalMensaje(): void {
    this.mostrarMensaje = false;
  }


  private moveMarker(lat: number, lng: number): void {
    this.destino.latitud = Number(lat.toFixed(6));
    this.destino.longitud = Number(lng.toFixed(6));
  
    if (!this.map) return;
  
    if (!this.marker) {
      this.marker = L.marker([lat, lng], { draggable: true }).addTo(this.map);
      this.marker.on('dragend', () =>
        this.ngZone.run(() => this.onUserConfirmedLocation())
      );
    } else {
      this.marker.setLatLng([lat, lng]);
    }
  
    this.map.setView([lat, lng], Math.max(this.map.getZoom(), 14));
  }

  private onUserConfirmedLocation(): void {
    if (!this.marker) return;
  
    const pos = this.marker.getLatLng();
    this.destino.latitud = Number(pos.lat.toFixed(6));
    this.destino.longitud = Number(pos.lng.toFixed(6));
    this.destino.precision = 'CONFIRMADO';
  
    console.log("onUserConfirmedLocation(), latitud=" + this.destino.latitud + ", longitud=" + this.destino.longitud);

    this.actualizarDireccionDesdeCoordenadas(
      this.destino.latitud,
      this.destino.longitud
    );
  }

  private tieneCoordenadasValidas(): boolean {
    const lat = this.destino.latitud;
    const lng = this.destino.longitud;
  
    if (lat == null || lng == null) return false;
  
    if (isNaN(lat) || isNaN(lng)) return false;
  
    if (lat < -90 || lat > 90) return false;
    if (lng < -180 || lng > 180) return false;
  
    return true;
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
  
}
