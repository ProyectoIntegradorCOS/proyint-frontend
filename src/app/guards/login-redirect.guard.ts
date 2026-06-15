import { CanActivateFn } from '@angular/router';
import { environment } from '../../environments/environment';

const URL_SAA = environment.api.rutaSaa;

/**
 * Guard que redirige automáticamente al login externo.
 * Solo se usa para rutas que deberían llevar al login.
 */
export const loginRedirectGuard: CanActivateFn = () => {
  // Redirige a la URL externa

  window.location.href = URL_SAA;

  // Retorna false para que Angular no cargue ninguna ruta interna
  return false;
};
