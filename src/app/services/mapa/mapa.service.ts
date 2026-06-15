import { Injectable } from '@angular/core';
import * as L from 'leaflet';

@Injectable({
  providedIn: 'root',
})
export class MapaService {

  
    configurarIconoLeaflet(): void {
    const baseHref =
      document.querySelector('base')?.getAttribute('href') || '/';

    const iconRetinaUrl = `${baseHref}leaflet/marker-icon-2x.png`;
    const iconUrl = `${baseHref}leaflet/marker-icon.png`;
    const shadowUrl = `${baseHref}leaflet/marker-shadow.png`;

    const defaultIcon = L.icon({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    // 🔥 Sobrescribe el icono por defecto de Leaflet
    L.Marker.prototype.options.icon = defaultIcon;
  }


}
