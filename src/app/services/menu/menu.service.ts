import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { jwtDecode } from 'jwt-decode';

export interface MenuItem {
  label: string;
  route?: string;
  children?: MenuItem[];
}

@Injectable({
  providedIn: 'root'
})
export class MenuService {

  // Orden explícito del menú por noAccion
  private readonly MENU_ORDER: Record<string, number> = {
  '/web.destinos': 1,  
  '/web.cuestionario': 2,  
  '/web.equipos': 3,
  '/web.usuarios': 4,    
  '/web.visitas': 5,
  // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-21 15:01 UTC-5 (Lima)][desc: Ordena opcion de pendientes de reprogramar][obj: MenuService.MENU_ORDER web.visitas-reprogramar]
  '/web.visitasxreprogramar': 6,
  '/web.seguimiento': 7,
  '/web.reportes': 8

};

  private menu: MenuItem[] = [];

  // BehaviorSubject para compartir el menú de forma reactiva
  private menuSubject = new BehaviorSubject<MenuItem[]>([]);
  menu$ = this.menuSubject.asObservable();

  constructor() {
    // 🟢 Restaurar el menú desde sessionStorage al iniciar el servicio
    const storedMenu = sessionStorage.getItem('menu');
    if (storedMenu) {
      try {
        this.menu = JSON.parse(storedMenu);
        this.menuSubject.next(this.menu);
        //console.log('🔄 Menú restaurado desde sessionStorage');
      } catch (err) {
        console.warn('⚠️ Error al restaurar menú desde sessionStorage:', err);
        this.menu = [];
      }
    }
  }

  /**
   * Genera el menú dinámico a partir del token JWT.
   * Si el token no tiene estructura esperada, devuelve un menú vacío.
   */
  generarMenu(token: string | null): MenuItem[] {
    if (!token) {
      console.warn('⚠️ Token no proporcionado al generar menú');
      return [];
    }

    try {
      const decoded: any = jwtDecode(token);
      //console.log('🔍 Token decodificado para menú:', decoded);

      const permisos: any[] = [];

      // 📋 Extraer permisos desde la estructura del token (según backend)
      if (Array.isArray(decoded.PerfilPermiso)) {
        decoded.PerfilPermiso.forEach((perfil: any) => {
          if (Array.isArray(perfil.arrPermisos)) {
            perfil.arrPermisos.forEach((permiso: any) => {
              permisos.push(permiso);
            });
          }
        });
      } else if (Array.isArray(decoded.permisos)) {
        decoded.permisos.forEach((permiso: any) => {
          permisos.push(permiso);
        });
      } else {
        console.warn('⚠️ Token no contiene permisos reconocibles');
      }

      //console.log('🔍 permisos:', JSON.stringify(permisos,null,2));

      // 🧠 🔽 FILTRAR SOLO PERMISOS CON tiPermiso == 2
      const permisosFiltrados = permisos.filter(p => String(p.tiPermiso) === '2');
      //console.log('🎯 Permisos filtrados (solo tiPermiso=2):', permisosFiltrados);

      // 🧩 Crear mapa de permisos
      const map: Map<string, MenuItem> = new Map();
      permisosFiltrados.forEach(p => {
        if (!p.idPermiso) return;
        map.set(p.idPermiso, {
          label: p.noPermiso || 'Sin nombre',
          route: p.noAccion ? '/' + p.noAccion : undefined,
          children: []
        });
      });

      // 🌳 Construir jerarquía del menú
      const menu: MenuItem[] = [];
      permisosFiltrados.forEach(p => {
        if (!p.idPermiso) return;
        const menuItem = map.get(p.idPermiso)!;
        if (p.idPermisoPadre) {
          const parent = map.get(p.idPermisoPadre);
          if (parent) {
            parent.children = parent.children || [];
            parent.children.push(menuItem);
          }
        } else {
          //console.log("menuItem: " + menuItem.label + ", " + menuItem.route);
          //Solamente agrega la opcion padre de la Plataforma Web
          if(menuItem.route === '/web') {
            menu.push(menuItem);
          }
        }
      });

      // 💾 Guardar menú en memoria, sessionStorage y BehaviorSubject
      //console.log("menu: "  + JSON.stringify(menu,null,2));

      const menuOrdenado = this.ordenarMenu(menu);
      this.menu = menuOrdenado;
      sessionStorage.setItem('menu', JSON.stringify(menuOrdenado));
      this.menuSubject.next(menuOrdenado);

      //console.log('✅ Menú generado correctamente (solo tiPermiso=2):', menu);
      return menuOrdenado;

    } catch (err) {
      console.error('❌ Error al decodificar token para generar menú:', err);
      return [];
    }
  }

  /**
   * Guarda el menú en memoria, sessionStorage y BehaviorSubject.
   */
  setMenu(menu: MenuItem[]): void {
    this.menu = menu;
    sessionStorage.setItem('menu', JSON.stringify(menu));
    this.menuSubject.next(menu);
  }

  /**
   * Devuelve el menú actual (de memoria o sessionStorage si es necesario).
   */
  getMenu(): MenuItem[] {
    if (this.menu.length > 0) {
      return this.menu;
    }

    const storedMenu = sessionStorage.getItem('menu');
    if (storedMenu) {
      try {
        this.menu = JSON.parse(storedMenu);
      } catch (err) {
        console.warn('⚠️ Error al leer menú desde sessionStorage:', err);
        this.menu = [];
      }
    }

    return this.menu;
  }

  /**
   * Limpia el menú (por ejemplo, al cerrar sesión).
   */
  clearMenu(): void {
    this.menu = [];
    sessionStorage.removeItem('menu');
    this.menuSubject.next([]);
  }  

  private ordenarMenu(menu: MenuItem[]): MenuItem[] {
    return [...menu]
      .sort((a, b) => {
        const orderA = this.MENU_ORDER[a.route ?? ''] ?? 999;
        const orderB = this.MENU_ORDER[b.route ?? ''] ?? 999;
        return orderA - orderB;
      })
      .map(item => ({
        ...item,
        children: item.children && item.children.length
          ? this.ordenarMenu(item.children)
          : []
      }));
  }

}
