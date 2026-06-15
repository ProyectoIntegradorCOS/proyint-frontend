import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { WelcomeComponent } from './pages/welcome/welcome';
import { Mapa } from './pages/mapa/mapa';
import { ReporteBandejaComponent } from './pages/reporte/reporte-bandeja/reporte-bandeja';
import { ReporteProductividadComponent } from './pages/reporte/reporte-productividad/reporte-productividad';
import { ColaboradorBandeja } from './pages/colaborador/colaborador-bandeja/colaborador-bandeja';
import { BandejaEquipoComponent } from './pages/equipo/equipo-bandeja/equipo-bandeja';
import { loginRedirectGuard } from './guards/login-redirect.guard';
import { VisitaBandejaComponent } from './pages/visita/visita-bandeja/visita-bandeja';
import { VisitaReprogramarBandejaComponent } from './pages/visita/visita-reprogramar-bandeja/visita-reprogramar-bandeja';
import { NotFoundComponent } from './pages/notfound/notfound';
import { DestinoBandejaComponent } from './pages/destino/destino-bandeja/destino-bandeja';
import { CuestionarioBandejaComponent } from './pages/cuestionario/cuestionario-bandeja/cuestionario-bandeja';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'thaqhiri/', component: HomeComponent },
  { path: 'welcome', component: WelcomeComponent },
  { path: 'web.equipos', component: BandejaEquipoComponent },  
  { path: 'web.usuarios', component: ColaboradorBandeja },  
  { path: 'web.destinos', component: DestinoBandejaComponent },
  { path: 'web.visitas', component: VisitaBandejaComponent },    
  // [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-01-21 15:01 UTC-5 (Lima)][desc: Ruta de pendientes de reprogramar][obj: app.routes web.visitas-reprogramar]
  { path: 'web.visitasxreprogramar', component: VisitaReprogramarBandejaComponent },
  { path: 'web.seguimiento', component: Mapa },
  { path: 'web.reportes', component: ReporteBandejaComponent },  
  { path: 'reporte-productividad', component: ReporteProductividadComponent },  
  { path: 'web.cuestionario', component: CuestionarioBandejaComponent },  
  // Para redirigir al login del SAA cuando se cierra sesion
  { path: 'login', canActivate: [loginRedirectGuard], component: HomeComponent },
  // Rutas no mapeadas van al NotFoundComponent
  { path: '**', component: NotFoundComponent }

];
