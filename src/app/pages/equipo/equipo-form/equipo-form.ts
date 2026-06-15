import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EquipoService } from '../../../services/equipo/equipo.service';
import { ColaboradorService } from '../../../services/colaborador/colaborador.service';
import { CuestionarioService } from '../../../services/cuestionario/cuestionario.service';
import { SessionService } from '../../../services/session/session.service';
import { SelectItem } from '../../../shared/models/select-item';
import { Equipo } from '../../../shared/models/equipo';

@Component({
  selector: 'app-equipo-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './equipo-form.html',
  styleUrl: './equipo-form.css'
})


export class EquipoFormComponent implements OnInit {

  @Input() modo: 'registro' | 'edicion' = 'registro';  
  @Input() equipo!: Equipo;

  @Output() guardado = new EventEmitter<void>();
  @Output() cerrado = new EventEmitter<void>();
 
  supervisores: SelectItem[] = [];
  cuestionarios: SelectItem[] = [];

  @ViewChild('nombreInputRef') nombreInputRef!: ElementRef; 

  mostrarModalConfirmacion: boolean = false;
  mostrarExito: boolean = false;
  mostrarMensaje: boolean = false;
  mensajeTexto: string = "";

  mostrarCarga: boolean = false;


  constructor(private equipoService: EquipoService, private colaboradorService: ColaboradorService, private sessionService: SessionService, private cuestionarioService: CuestionarioService) {}

  ngOnInit(): void { 
    this.cargarSupervisores();
    this.cargarCuestionarios();
    
    if (this.modo === 'registro') {
      // Foco solo en registro
      setTimeout(() => {
        const el = document.querySelector('input[name="nombre"]') as HTMLInputElement;
        if (el) el.focus();
      }, 200);

      //Inicializar el valor predeterminado del select
        this.equipo = {
        nombre: '',
        idCuestionario: null,
        supervisorId: null,
        usuarioSesion: '',
        realizaVisitas: false
      };
    }
  }

  cargarSupervisores() {
    this.mostrarCarga = true;

    this.colaboradorService.listarPersonasActivasTotal().subscribe({
      next: (resp) => {
        this.mostrarCarga = false;

        if (resp.codigoResultado === "1" && Array.isArray(resp.resultados)) {
          this.supervisores = resp.resultados.map((p: any) => ({
            id: p.id,
            label: p.nombre    // el nombre de persona va como label
          }));
        } else {
          this.supervisores = [];
        }
      },
      error: () => {
        this.mostrarCarga = false;
        this.supervisores = [];
      }
    });
  }

  cargarCuestionarios() {
    this.mostrarCarga = true;

    this.cuestionarioService.listarCuestionarios().subscribe({
      next: (resp) => {
        this.mostrarCarga = false;

        if (resp.codigoResultado === "1" && Array.isArray(resp.resultados)) {
          this.cuestionarios = resp.resultados.map((p: any) => ({
            id: p.id,
            label: p.nombre    // el nombre de persona va como label
          }));
        } else {
          this.cuestionarios = [];
        }
      },
      error: () => {
        this.mostrarCarga = false;
        this.cuestionarios = [];
      }
    });
  }

  guardar() {
    this.mostrarCarga = true;

    this.equipo.usuarioSesion = this.sessionService.getSession()?.usuario;
  
    const request$ = 
      this.modo === 'registro'
        ? this.equipoService.registrarEquipo(this.equipo)
        : this.equipoService.actualizarEquipo(this.equipo);
  
    request$.subscribe({
      next: (resp) => {
        this.mostrarCarga = false;
        //console.log("resp: " + JSON.stringify(resp,null,2));

        // Validación del DTO estándar
        if (resp && resp.codigoResultado === "2") {
          this.mostrarModalExito();          
        } else {
          this.mostrarModalMensaje("No se pudo realizar la operación.");
        }
      },
      error: (err) => {
        this.mostrarCarga = false;
        console.error("Error HTTP:", err);
        alert("Ocurrió un error.");
      }
    });
  }
  

  cerrar() {
    this.cerrado.emit();
  }


  /* Funcion para validar si ya existe un equipo con el nombre. */
  validarEquipo(): void {

    if (!this.equipo.nombre || this.equipo.nombre.trim() === '') {
      this.mostrarModalMensaje('Escriba el nombre del equipo');
      return;
    }

    if (!this.equipo.supervisorId || this.equipo.supervisorId == null) {
      this.mostrarModalMensaje('Seleccione al líder del equipo');
      return;
    }

    if (!this.equipo.idCuestionario || this.equipo.idCuestionario === null || this.equipo.idCuestionario.toString() === "null") {
      this.mostrarModalMensaje('Seleccione el cuestionario');
      return;
    }

    if (this.modo === 'registro') {
      this.equipoService.buscarPorNombre(this.equipo.nombre).subscribe(resp => {
        if (resp.codigoResultado === "1") {
          this.mostrarModalMensaje("Ya existe un equipo con el nombre indicado.");
        } else {
          //Mostrar modal de confirmación
          this.confirmarGuardar();
        }
      });
    }
    else {
      this.equipoService.buscarPorNombreOtroId(this.equipo.nombre, this.equipo.id).subscribe(resp => {
        if (resp.codigoResultado === "1") {
          this.mostrarModalMensaje("Ya existe otro equipo con el nombre indicado.");
        } else {
          //Mostrar modal de confirmación
          this.confirmarGuardar();
        }
      });
    }
  }

  /* Funciones para el modal de confirmacion */
  confirmarGuardar() {
    this.mostrarModalConfirmacion = true;      
  }

  aceptarGuardar() {
    this.mostrarModalConfirmacion = false;   
    this.guardar(); 
  }
  
  cancelarGuardar() {
    this.mostrarModalConfirmacion = false;    
  }

  /* Funciones para el modal de mensaje */
  mostrarModalExito() {
    this.mostrarExito = true;    
  }

  cerrarModalExito() {
    this.mostrarExito = false;
    this.guardado.emit();
  }

  mostrarModalMensaje(texto: string) {
    this.mensajeTexto = texto;
    this.mostrarMensaje = true;
  }

  cerrarModalMensaje() {
    this.mostrarMensaje = false;
  }

}
