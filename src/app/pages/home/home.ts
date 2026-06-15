import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { MenuService } from '../../services/menu/menu.service';
import { SessionService } from '../../services/session/session.service';
import { MetricsService } from '../../services/metrics/metrics.service';
import { MensajeService } from '../../services/mensaje/mensaje.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent implements OnInit {

  loading = true;
  token: string | null = null;
  idUsuaSist: number | null = null;  

  constructor(
    private authService: AuthService,
    private menuService: MenuService,
    private sessionService: SessionService,
    private mensajeService: MensajeService,
    private metricsService: MetricsService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const semilla = this.route.snapshot.queryParamMap.get('saa');

    if (!semilla) {
      console.warn('⚠️ No se encontró parámetro "saa" en la URL.');
      this.loading = false;
      return;
    }

    //console.log('🔐 Generando token con semilla:', semilla);

    // 1️⃣ Llamada al servicio para generar el token
    this.authService.generarToken(semilla).subscribe({
      next: (res: any) => {

        // Aseguramos que el backend devolvió un objeto JSON válido
        if (typeof res === 'string') {
          try {
            console.error('❌ Respuesta del servidor es String:', res);
            res = JSON.parse(res);
          } catch {
            console.error('❌ Respuesta del servidor no es JSON válido:', res);
            this.loading = false;
            return;
          }
        }

        // 2️⃣ Extraer el token directamente
        this.token = res?.token || null;
        this.idUsuaSist = res?.idUsuaSist || 0;

        if(this.idUsuaSist === 0) {
          //alert("Su usuario se encuentra inactivo. Contacte al Administrador del sistema.");
          const message = 'Tiene acceso al sistema, pero su usuario aún no ha sido registrado en Thaqhiri o se encuentra inactivo. Contacte al Administrador del sistema.';
          this.mensajeService.showModal(message, 'info');
        }

        //console.log('🪪 Id usuario thaqhiri recibido:', this.idUsuaSist);
        //console.log('🪪 Token recibido:', this.token);        

        this.loading = false;

        if (!this.token) {
          console.error('❌ No se encontró token en la respuesta del servidor');
          return;
        }

        // 3️⃣ Guardar sesión (SessionService decodifica el token)
        this.sessionService.setSession(this.token, this.idUsuaSist ?? 0);
        // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-23 12:01 UTC-5 (Lima)][desc: Registra métrica de inicio de sesión en web][obj: HomeComponent.ngOnInit]
        this.metricsService.trackEvent({
          action: 'login_web',
          screen: 'home',
          status: 'success'
        });

        // 4️⃣ Generar menú dinámico
        const menu = this.menuService.generarMenu(this.token);
        //console.log('📋 Menú generado:', menu);

        // 5️⃣ Redirección al componente principal
        this.router.navigate(['/welcome']);
      },
      error: (err) => {
        console.error('❌ Error al generar token', err);
        this.token = null;
        this.loading = false;
        // No se registra métrica aquí porque no hay token aún para endpoint protegido.
      }
    });
  }

}
