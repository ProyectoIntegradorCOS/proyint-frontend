import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { SessionService } from '../../services/session/session.service';
import { MenuService } from '../../services/menu/menu.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  usuario = '';
  clave = '';
  loading = false;
  errorMsg = '';

  constructor(
    private authService: AuthService,
    private sessionService: SessionService,
    private menuService: MenuService,
    private router: Router
  ) {}

  login(): void {
    this.errorMsg = '';

    if (!this.usuario.trim() || !this.clave.trim()) {
      this.errorMsg = 'Ingrese usuario y contraseña.';
      return;
    }

    this.loading = true;

    this.authService.login(this.usuario.trim(), this.clave).subscribe({
      next: (res: any) => {
        this.loading = false;

        const token = res?.token || null;
        const idUsuaSist = res?.idUsuaSist || 0;

        if (!token) {
          this.errorMsg = 'No se recibió token del servidor.';
          return;
        }

        this.sessionService.setSession(token, idUsuaSist);
        this.menuService.generarMenu(token);
        this.router.navigate(['/welcome']);
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 401) {
          this.errorMsg = 'Usuario o contraseña incorrectos.';
        } else {
          this.errorMsg = 'Error al conectar con el servidor. Intente de nuevo.';
        }
      }
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.login();
    }
  }
}
