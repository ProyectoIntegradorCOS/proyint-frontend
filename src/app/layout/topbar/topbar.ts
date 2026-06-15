import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth/auth.service';
import { MenuService } from '../../services/menu/menu.service';
import { SessionService, UserSession } from '../../services/session/session.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './topbar.html',
  styleUrls: ['./topbar.css']
})
export class TopbarComponent implements OnInit, OnDestroy {
  fecha = '';
  appName = 'Thaqhiri';
  nombreUsuario = 'Usuario';

  private destroy$ = new Subject<void>();

  constructor(
    private auth: AuthService,
    private router: Router,
    private menuService: MenuService,
    private sessionService: SessionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    //console.log('🧭 [Topbar] Inicializando componente');
    this.actualizarFecha();

    const currentSession = this.sessionService.getSession();
    if (currentSession) {
      this.nombreUsuario = currentSession.nombreCompleto || currentSession.usuario || 'Usuario';
      //console.log(`✅ [Topbar] Sesión restaurada desde almacenamiento → ${this.nombreUsuario}`);
      this.cdr.detectChanges();
    }

    this.sessionService.session$
      .pipe(takeUntil(this.destroy$))
      .subscribe((session: UserSession | null) => {
        this.nombreUsuario = session?.usuario || 'Usuario';
        //console.log(session ? `✅ [Topbar] Sesión activa → ${this.nombreUsuario}` : '⚠️ [Topbar] No hay sesión activa');
        this.cdr.detectChanges();
      });
  }

  private actualizarFecha(): void {
    const hoy = new Date();
    const fechaFormateada = hoy.toLocaleDateString('es-PE', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    this.fecha = `${fechaFormateada.charAt(0).toUpperCase()}${fechaFormateada.slice(1)}`;
  }

  /**
   * 🔐 Cierra la sesión del usuario:
   * 1. Llama al backend para cerrar sesión (el interceptor agregará el token)
   * 2. Limpia los recursos del front
   * 3. Redirige al login
   */
  logout(): void {
    console.log('🚪 [Topbar] Cerrar sesión');

    // No pasar token manualmente; interceptor se encargará
    this.auth.logout().subscribe({
      next: () => {
        console.log('✅ [Topbar] Sesión cerrada correctamente en el backend');
        this.limpiarYRedirigir();
      },
      error: (err) => {
        console.error('❌ [Topbar] Error al cerrar sesión en el backend:', err);
        this.limpiarYRedirigir();
      }
    });
  }

  private limpiarYRedirigir(): void {
    console.log('🧹 [Topbar] Limpiando sesión local...');
    this.sessionService.clearSession();
    this.menuService.clearMenu();
    sessionStorage.clear();
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    console.log('🧹 [Topbar] Componente destruido');
  }
}
