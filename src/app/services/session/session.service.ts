import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MenuService } from '../../services/menu/menu.service';
import { jwtDecode } from 'jwt-decode';

export interface UserSession {
  idUsuario: string | number;
  usuario: string;
  nombreCompleto?: string;
  token: string;
  idUsuaSist: number;
  permisosUsuarioBotones: PermisosBotones
}

export interface Permiso {
  tiPermiso: string;
  nivel: string;
  idPermiso: string;
  noPermiso: string | null;
  noAccion: string | null;
  idOpcionAplicativo: number;
  idPermisoPadre: string | null;
}

export interface PermisosBotones {
  [key: string]: boolean;
}


@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private sessionData: UserSession | null = null;

  // 🔔 BehaviorSubject inicializado con la sesión almacenada (si existe)
  private sessionSubject: BehaviorSubject<UserSession | null>;

  // Observable público al que otros componentes pueden suscribirse
  session$;

  private permisosBotones: PermisosBotones = {};

  private reglasBotones = [
    { key: 'destinos.nuevo',                padre: 'web.destinos',             hijo: 'Nuevo' },
    { key: 'destinos.editar',               padre: 'web.destinos',             hijo: 'Editar' },
    { key: 'destinos.eliminar',             padre: 'web.destinos',             hijo: 'Eliminar' },
    { key: 'cuestionario.nuevo',            padre: 'web.cuestionario',         hijo: 'Nuevo' },
    { key: 'cuestionario.editar',           padre: 'web.cuestionario',         hijo: 'Editar' },
    { key: 'cuestionario.eliminar',         padre: 'web.cuestionario',         hijo: 'Eliminar' },
    { key: 'usuarios.editar',               padre: 'web.usuarios',             hijo: 'Editar' },
    { key: 'usuarios.sincronizar',          padre: 'web.usuarios',             hijo: 'Sincronizar' },
    { key: 'visitas.nuevo',                 padre: 'web.visitas',              hijo: 'Nuevo' },
    { key: 'visitas.editar',                padre: 'web.visitas',              hijo: 'Editar' },
    { key: 'visitas.eliminar',              padre: 'web.visitas',              hijo: 'Eliminar' },
    { key: 'visitas.todoslosequipos',       padre: 'web.visitas',              hijo: 'Ver todos los equipos' },
    { key: 'equipos.nuevo',                 padre: 'web.equipos',              hijo: 'Nuevo' },
    { key: 'equipos.editar',                padre: 'web.equipos',              hijo: 'Editar' },
    { key: 'equipos.eliminar',              padre: 'web.equipos',              hijo: 'Eliminar' },
    { key: 'seguimiento.todoslosequipos',   padre: 'web.seguimiento',          hijo: 'Ver todos los equipos' },
    { key: 'reportes.todoslosequipos',      padre: 'web.reportes',             hijo: 'Ver todos los equipos' },
    { key: 'reprogramar.visitas',           padre: 'web.visitasxreprogramar',  hijo: 'Reprogramar' },
    { key: 'reprogramar.todoslosequipos',   padre: 'web.visitasxreprogramar',  hijo: 'Ver todos los equipos' }    
  ];
 

  constructor(private menuService: MenuService) {
    // 🟢 Intentar cargar sesión previa al iniciar el servicio
    const stored = sessionStorage.getItem('session');
    this.sessionData = stored ? JSON.parse(stored) : null;

    // 💡 Inicializar el BehaviorSubject con el valor restaurado, no con null
    this.sessionSubject = new BehaviorSubject<UserSession | null>(this.sessionData);
    this.session$ = this.sessionSubject.asObservable();

    //Restaura los permisos de botones
    if (this.sessionData) {
      if (this.sessionData?.permisosUsuarioBotones) {
        this.permisosBotones = this.sessionData.permisosUsuarioBotones;
      }
    }
  }

  /**
   * Guarda la sesión a partir de un token JWT, decodificándolo internamente.
   * @param token Token JWT recibido desde el backend
   */
  setSession(rawToken: any, idUsuarioSistema: number): void {
    if (!rawToken) {
      console.warn('⚠️ SessionService → token vacío, no se puede establecer sesión');
      return;
    }
  
    // Extraer el valor real del token
    let token: string | undefined;
  
    if (typeof rawToken === 'string') {
      try {
        // Intentar parsear por si es JSON
        const parsed = JSON.parse(rawToken);
        token = parsed?.token;
      } catch {
        // No es JSON, usar tal cual
        token = rawToken;
      }
    } else if (typeof rawToken === 'object') {
      token = rawToken?.token;
    }
  
    if (!token) {
      console.warn('⚠️ SessionService → no se pudo extraer el token real');
      return;
    }
  
    // Decodificar payload del JWT solo si tiene formato JWT
    let payload: any = {};
    try {
      if (token.includes('.')) {
        const base64Payload = token.split('.')[1];
        const decodedPayload = atob(base64Payload);
        payload = JSON.parse(decodedPayload);
      }
    } catch (err) {
      console.error('❌ Error al decodificar el token JWT:', err);
    }
  
    //Obtener los permisos del usuario
    this.inicializarPermisos(token);

    // Guardar la sesión con el token real
    this.sessionData = {
      idUsuario: payload.sub || 0,
      usuario: payload.Usuario || 'usuario',
      nombreCompleto: payload.Nombre || 'Usuario del sistema',
      token, // ← Solo el string del token
      idUsuaSist: idUsuarioSistema || 0,
      permisosUsuarioBotones: this.permisosBotones
    };
  
    //console.log('🧩 SessionService → sesión establecida:', this.sessionData);
  
    // Guardar en sessionStorage solo el token real dentro de la sesión
    sessionStorage.setItem('session', JSON.stringify(this.sessionData));
  
    // Actualizar suscriptores
    this.sessionSubject.next(this.sessionData);
  }
  
  
  

  /**
   * Retorna la sesión actual, intentando cargarla desde sessionStorage si no está en memoria.
   */
  getSession(): UserSession | null {
    if (!this.sessionData) {
      const stored = sessionStorage.getItem('session');
      if (stored) {
        this.sessionData = JSON.parse(stored);
        this.sessionSubject.next(this.sessionData);
      }
    }
    return this.sessionData;
  }

  /**
   * Limpia la sesión actual y notifica a los suscriptores.
   */
  clearSession(): void {
    this.sessionData = null;
    this.permisosBotones = {};
    sessionStorage.removeItem('session');
    this.sessionSubject.next(null);    
    console.log('🧹 SessionService → sesión eliminada');
  }

  logoutSinToken(): void {
    this.clearSession();
    this.menuService.clearMenu();
    sessionStorage.clear();    
  }

  /**
   * Obtiene el token de la sesión actual.
   */
  getToken(): string | null {
    return this.getSession()?.token || null;
  }


  
  inicializarPermisos(token: string | null): void {

    if (!token) {
      console.warn('⚠️ Token no proporcionado al generar menú');
      return;
    }

    try {
      const decoded: any = jwtDecode(token);
      //console.log('🔍 Token decodificado para menú:', decoded);

      const permisos: Permiso[] = [];

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

      this.permisosBotones = {};
    
      this.reglasBotones.forEach(r => {
        const permitido = this.buscarPermisoExiste(
          permisos,
          r.padre,
          r.hijo
        );

        this.permisosBotones[r.key] = permitido;
      });

      //console.log('🔍 permisosBotones:', JSON.stringify(this.permisosBotones,null,2));

    } catch (err) {
      console.error('❌ Error al decodificar token para obtener los permisos:', err);
    }
  }
  

  buscarPermisoExiste(permisos: Permiso[], nombreAccionPadre: string, nombrePermisoBotonHijo: string): boolean 
  {  
    if (!Array.isArray(permisos) || permisos.length === 0) {
      return false;
    }
  
    // 1️⃣ Buscar el permiso PADRE (opción)
    const permisoPadre = permisos.find(p =>
      p.tiPermiso === '2' &&
      p.noAccion === nombreAccionPadre
    );
  
    if (!permisoPadre) {
      //El padre no existe
      return false;
    }
  
    // 2️⃣ Buscar el permiso HIJO (botón) asociado al padre
    const existeHijo = permisos.some(p =>
      p.tiPermiso === '1' &&
      p.noPermiso === nombrePermisoBotonHijo &&
      p.idPermisoPadre === permisoPadre.idPermiso
    );
  
    //El resultado final depende de si el hijo existe o no
    return existeHijo;
  }

  tienePermiso(key: string): boolean {    
    return !!this.sessionData?.permisosUsuarioBotones?.[key];
  }

}
