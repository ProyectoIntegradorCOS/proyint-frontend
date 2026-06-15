import { Component, Input, Output, EventEmitter, inject, OnChanges, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { DestinoService, DestinoResultado} from '../../../services/destino/destino.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-destino-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './destino-selector.html',
  styleUrl: './destino-selector.css',
})
export class DestinoSelectorComponent implements OnChanges {

  @Input() abierto = false; 

  @Output() seleccionado = new EventEmitter<DestinoResultado>();
  @Output() cerrado = new EventEmitter<void>();
  @Output() nuevo = new EventEmitter<void>();

  @ViewChild('txtBuscar') txtBuscar!: ElementRef<HTMLInputElement>;

  ubicabilidad = ''; 
  filtroDestino = '';
  filtroDireccion = '';
  destinosEncontrados: DestinoResultado[] = [];

  private readonly destinoService = inject(DestinoService);

  totalRegistros = 0;
  paginas: number[] = [];  
  totalPaginas: number = 1;
  paginaActual: number = 1;
  tamanioPagina: number = 7;
  columnaOrden: string = 'nombre';  
  orden: string = 'ASC';

  seleccionarAutomatico: boolean = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['abierto']?.currentValue === true) {
      this.resetear();  //Borra los datos de la busqueda anterior
      
      //this.buscarDestinos();   // 👈 ejecuta la búsqueda inicial

      // Espera a que Angular pinte el modal
      setTimeout(() => {
        this.txtBuscar?.nativeElement?.focus();
      }, 0);
      
    }
  }

  private resetear() {
    this.filtroDestino = '';
    this.filtroDireccion = '';
    this.destinosEncontrados = [];
    this.totalRegistros = 0;
    this.totalPaginas = 1;
    this.paginas = [];
    this.paginaActual = 1;
  }

  
  buscarDestinos() {
    this.destinoService.buscarDestinos(this.filtroDestino, this.filtroDireccion, this.paginaActual, this.tamanioPagina, this.orden, this.columnaOrden)
    .subscribe({
      next: resp => {
        this.totalRegistros = resp.totalRegistros;

        if (resp.codigoResultado === 1) {
          this.destinosEncontrados = resp.resultados;
          this.paginaActual = resp.paginaActual;
          this.totalPaginas = resp.totalPaginas;  
          this.generarPaginas();        

          if(this.totalRegistros == 1 && this.seleccionarAutomatico) {
            this.seleccionar(this.destinosEncontrados[0]);
          }
        } else {
          this.destinosEncontrados = [];
          this.totalPaginas = 1;      
          this.paginas = [];    
        }

        //Limpieza
        this.seleccionarAutomatico = false;
      },
      error: () => this.destinosEncontrados = []
    });
  } 

  seleccionar(d: DestinoResultado) {    
    this.seleccionado.emit(d);
  }

  cerrar() {
    this.cerrado.emit();
  }

  nuevoDestino() {
    this.nuevo.emit();
  }


  irPagina(nuevaPagina: number): void {
    if (nuevaPagina < 1 || nuevaPagina > this.totalPaginas) return;
    this.paginaActual = nuevaPagina;
    this.buscarDestinos();
  }

  private generarPaginas(): void {
    this.paginas = Array.from(
      { length: this.totalPaginas },
      (_, i) => i + 1
    );
  }

  onCambioPagina(): void {
    this.irPagina(this.paginaActual);
  }

  recargarConNuevoDestino(destino: any) {
    // Vuelve a buscar los datos del nuevo destino recien registrado
    // y si solo hay uno en este caso lo selecciona de forma automática
    this.filtroDestino = destino.nombre;
    this.filtroDireccion = destino.direccion ?? '';
    this.seleccionarAutomatico = true;
    this.paginaActual = 1;
    this.buscarDestinos();    
  }

}
