import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpErrorResponse // Importar para manejar errores de respuesta
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs'; // Importar throwError
import { catchError } from 'rxjs/operators'; // Importar catchError
import { Router } from '@angular/router'; // Importar Router para redirección
import { SessionService } from '../services/session/session.service';
import { MensajeService } from '../services/mensaje/mensaje.service';
// ⚠️ Lista de URLs a las que NO se debe adjuntar token
const EXCLUDED_URLS = [
  '/api/auth/token',
  '/v1/mapbox/'
];


export const AuthInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {

  console.log("Interceptor inicio");

  const sessionService = inject(SessionService);
  const router = inject(Router); // Inyectar Router para navegar
  const mensajeService = inject(MensajeService);
  
  // 1️⃣ Verificar si la URL debe excluirse
  const exclude = EXCLUDED_URLS.some(url => req.url.includes(url));
  if (exclude) {
    console.log("AuthInterceptor, ruta excluida");
    return next(req);
  }

  // 2️⃣ Obtener token desde SessionService
  const token = sessionService.getToken();

  // 3️⃣ Preparar la solicitud (con o sin token)
  let authReq = req;
  if (token) {
    // 4️⃣ Clonar request agregando Authorization (si hay token)
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  } else {
    console.log("AuthInterceptor, no hay token, continuar normal");
  }

  // 5️⃣ Devolver el flujo con manejo de errores
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {

      // *** Lógica de Manejo de Token Inválido/Expirado ***
      if (error.status === 401) {        
        sessionService.logoutSinToken();

        const message = 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.';        
        mensajeService.showModal(message, 'warning');        

        setTimeout(() => {
          router.navigate(['/login']);
        }, 3000);

        // Lanzar error para detener el flujo de la petición original
        return throwError(() => error);
      }

      // Si el error no es 401, o si es una ruta excluida, simplemente relanzamos el error
      return throwError(() => error);
    })
  );
};