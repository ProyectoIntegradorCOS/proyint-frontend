import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common'; 

@Component({
selector: 'app-reporte-bandeja',
standalone: true,
imports: [CommonModule],
templateUrl: './reporte-bandeja.html',
styleUrls: ['./reporte-bandeja.css']
})

export class ReporteBandejaComponent {

  reportes = [
    {
      nombre: 'Reporte de Productividad',
      icono: 'productividad.png',
      ruta: '/reporte-productividad'
    }
  ];

 
  constructor(private router: Router) {}


  irDetalle(ruta: string) {
  this.router.navigate([ruta]);
  }
}