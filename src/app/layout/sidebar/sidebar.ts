import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MenuService, MenuItem } from '../../services/menu/menu.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css']
})
export class SidebarComponent implements OnInit, OnDestroy {
  menu: MenuItem[] = [];
  private destroy$ = new Subject<void>();

  constructor(private menuService: MenuService) {}

  ngOnInit(): void {
    //console.log('🧭 Sidebar → inicializando...');

    // 1️⃣ Intentar cargar el menú actual desde el servicio (memoria o sessionStorage)
    const currentMenu = this.menuService.getMenu();
    if (currentMenu && currentMenu.length > 0) {
      this.menu = currentMenu;
      //console.log('📋 Menú inicial cargado desde sessionStorage:', this.menu);
    } else {
      //console.log('⚠️ No se encontró menú inicial en sessionStorage');
    }

    // 2️⃣ Suscribirse al observable reactivo del menú
    this.menuService.menu$
      .pipe(takeUntil(this.destroy$))
      .subscribe((menu: MenuItem[]) => {
        if (!menu || menu.length === 0) {
          //console.warn('⚠️ Menú vacío recibido en Sidebar');
        } else {
          //console.log('🔄 Menú actualizado en Sidebar:', menu);
        }
        this.menu = menu;
      });
  }

  ngOnDestroy(): void {
    // 3️⃣ Limpiar suscripciones al destruir el componente
    this.destroy$.next();
    this.destroy$.complete();
    console.log('🧹 Sidebar destruido y suscripciones limpiadas');
  }
}
