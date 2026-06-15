import { Component, Input, Output, EventEmitter, OnInit, inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ColaboradorService } from '../../../services/colaborador/colaborador.service';
import { lastValueFrom } from 'rxjs'; // 🚀 NECESARIO para obtener los datos de las listas
import { EquipoService } from '../../../services/equipo/equipo.service'; // 🚀 NECESARIO
import { SessionService } from '../../../services/session/session.service';
import { HorarioService, Horario } from '../../../services/horario/horario.service';

// --- NUEVAS INTERFACES ---
interface ItemLista {
  id: number | null;
  nombre: string;
}

@Component({
  selector: 'app-colaborador-form',
  standalone: true, 
  imports: [CommonModule, ReactiveFormsModule], // Importa módulos necesarios
  templateUrl: './colaborador-form.html',
  styleUrls: ['./colaborador-form.css']
})
export class ColaboradorForm implements OnInit, AfterViewInit {
  
  // Referencia al elemento input del usuario
  @ViewChild('usuarioInput') usuarioInputRef!: ElementRef;

  // Entrada: Recibe datos para el modo edición (null para registro)
  @Input() colaboradorData: any = null; 
  
  // Salida: Comunica al padre (bandeja) que debe cerrar el modal y refrescar (true)
  @Output() cerrarForm = new EventEmitter<boolean>(); 

  // --- NUEVAS PROPIEDADES PARA LISTAS ---
  equipos: ItemLista[] = [];
  
  // Inyección de dependencias usando 'inject' (práctica moderna de Angular)
  private fb = inject(FormBuilder);
  private colaboradorService = inject(ColaboradorService);
  private equipoService = inject(EquipoService);
  private sessionService = inject(SessionService);
  private horarioService = inject(HorarioService);

  colaboradorForm: FormGroup = this.fb.group({
    id: [null],
    nombre: ['', Validators.required],
    usuario: ['', Validators.required],
    horarioId: [null, Validators.required],
    equipoId: [null],
    estado: [1],
    saaSubject: [null],
    usuarioSesion: this.sessionService.getSession()?.usuario
  });

  modoEdicion: boolean = false;

  horarios: Horario[] = [];

  mostrarModalConfirmacion: boolean = false;
  mostrarModalResultado: boolean = false;
  mensajeResultado: string = "";
  mostrarModalMensaje: boolean = false;
  mensajeModal: string = "";

  ngOnInit(): void {

    //console.log("this.colaboradorData:",JSON.stringify(this.colaboradorData,null,2));

    // Determina el modo (Registro o Edición)
    this.modoEdicion = !!this.colaboradorData;

    // para que coincidan con los IDs de las opciones en el <select>
    //const equipoId = this.colaboradorData?.equipoId ? Number(this.colaboradorData.equipoId) : null;
    
    if (this.modoEdicion) {
      // 💡 Corrección para horarioId y equipoId
      const vHorarioId = this.colaboradorData.horarioId !== null ? Number(this.colaboradorData.horarioId)  : null;
      const vEquipoId = this.colaboradorData.equipoId !== null ? Number(this.colaboradorData.equipoId) : null;
          
      this.colaboradorForm.patchValue({
        id: this.colaboradorData.id,
        nombre: this.colaboradorData.nombre,
        usuario: this.colaboradorData.usuario,
        horarioId: vHorarioId,
        equipoId: vEquipoId,
        estado: Number(this.colaboradorData.estado),
        saaSubject: this.colaboradorData.saaSubject
      });
    }

    this.cargarListas(); 

    // Limpiar nombre y subject si cambia el usuario
    this.colaboradorForm.get('usuario')?.valueChanges.subscribe(() => {
      this.colaboradorForm.patchValue(
        {
          nombre: '',
          saaSubject: null
        },
        { emitEvent: false } // evita eventos recursivos
      );
    });

  }


  ngAfterViewInit(): void {
    // La lógica de enfoque va aquí
    if (!this.modoEdicion && this.usuarioInputRef) {
        this.usuarioInputRef.nativeElement.focus();
    }
  }


  confirmarGuardar() {

    if (this.colaboradorForm.invalid) {
      this.colaboradorForm.markAllAsTouched();
      console.error('Formulario inválido.');
      this.mostrarMensajeModal("Debe completar el formulario.");
      return;
    }

    this.validarUsuarioExiste(2);    
  }

  aceptarGuardar() {
    this.mostrarModalConfirmacion = false;
    this.guardar(); // ahora sí guardar
  }
  
  cancelarGuardar() {
    this.mostrarModalConfirmacion = false;
  }

  // Método llamado al enviar el formulario
  guardar(): void {    
    //Si llega a este punto el formulario es valido
    const data = this.colaboradorForm.value;
    //console.log("data: ", JSON.stringify(data, null, 2));

    if (this.modoEdicion) {
      // Lógica de Actualización (PUT)
      this.colaboradorService.actualizar(data.id, data).subscribe({
        next: () => this.handleSuccess(true),
        error: (err) => this.handleError(err)
      });
    } 
    else {
      // Lógica de Registro (POST)      
      this.colaboradorService.registrar(data).subscribe({
        next: () => this.handleSuccess(true),
        error: (err) => this.handleError(err)
      });
    }
  }
  
  handleSuccess(refrescar: boolean): void {
    //console.log('Operación exitosa.');
    this.mostrarModalMensajeResultado("Los datos se guardaron exitósamente.");
  }

  handleError(error: any): void {
    //console.error('Error en la operación:', error);
    this.mostrarModalMensajeResultado("La operación no se pudo realizar.");
  }

  // 4. Método llamado por el botón de cancelar o cierre (emite false para no refrescar)
  cancelar(): void {
    this.cerrarForm.emit(false);
  }

  mostrarModalMensajeResultado(mensaje: string): void {
    this.mostrarModalResultado = true;
    this.mensajeResultado = mensaje;
  }

  cerrarModalMensajeResultado(): void {
    this.mostrarModalResultado = false;
    this.mensajeResultado = "";
    this.cerrarForm.emit(true); // ahora sí cerramos y refrescamos
  }

  mostrarMensajeModal(mensaje: string): void {
    this.mostrarModalMensaje = true;
    this.mensajeModal = mensaje;
  }

  cerrarMensajeModal(): void {
    this.mostrarModalMensaje = false;
    this.mensajeModal = "";
  }


  // --- NUEVO MÉTODO PARA CARGAR DATOS ---
  async cargarListas(): Promise<void> {
    try {
        // Cargar Equipos (Asumiendo que EquipoService tiene un método listarActivos)
        const dataEquipos: any = await lastValueFrom(this.equipoService.listarActivos());
        this.equipos = dataEquipos.resultados || [];


        this.horarioService.getHorarios().subscribe({
          next: (data) => this.horarios = data,
          error: (err) => console.error('Error al cargar horarios', err)
        });

    } catch (error) {
        console.error('Error al cargar listas desplegables:', error);
        // Podrías emitir un mensaje de error al padre o manejarlo aquí
    }
  }


  validarBusquedaUsuarioSaa() {
    // 🔹 Limpiar campos antes de hacer la búsqueda
    this.colaboradorForm.patchValue({
      nombre: '',
      saaSubject: null
    });

    const usuario = this.colaboradorForm.get('usuario')?.value?.trim();
  
    if (!usuario) {
      this.mostrarMensajeModal("Debe ingresar un usuario antes de buscar.");
      return;
    }

    this.validarUsuarioExiste(1);    
  }

  buscarUsuarioSaa(usuario: string) {

    this.colaboradorService.buscarUsuarioSaa(usuario).subscribe({
      next: (resp: any) => {
        //console.log("Respuesta de buscarUsuario:", JSON.stringify(resp,null,2));
  
        // Validar estructura del backend
        if (!resp || resp.codigoResultado !== "1" || !resp.resultados || resp.resultados.length === 0) {
          this.mostrarMensajeModal("No se encontró el usuario asociado al sistema Thaqhiri en el SAA.");
          return;
        }
  
        const u = resp.resultados[0];
  
        // Concatenar los nombres
        const nombreCompleto = `${u.nombres} ${u.apePaterno} ${u.apeMaterno}`.trim();
  
        this.colaboradorForm.patchValue({
          nombre: nombreCompleto,
          saaSubject: u.idUsuario ?? null
        });
      },
  
      error: (err) => {
        console.error("Error al buscar usuario:", err);
        this.mostrarMensajeModal("Ocurrió un error al buscar el usuario.");
      }
    });
  }


  

  validarUsuarioExiste(evento: number) {

    // Obtener el login escrito por el usuario    
    const login = this.colaboradorForm.get('usuario')?.value?.trim();

    // Llamar al backend
    if (this.modoEdicion) {
      const id = this.colaboradorForm.get('id')?.value;

      this.colaboradorService.buscarOtroUsuarioIdLogin(id, login).subscribe({
        next: (resp) => {
          if (resp.codigoResultado === "1" && resp.resultados.length > 0) {  
            this.mostrarMensajeModal("El usuario indicado ya está asignado a otro colaborador registrado en Thaqhiri.");
          } 
          else {
            // Usuario NO encontrado
            if(evento === 1) {
              //buscar el usuario en el SAA
              this.buscarUsuarioSaa(login);
            }
            else if(evento === 2) {
              //mostrar el modal de confirmnacion
              this.mostrarModalConfirmacion = true;          
            }
          }
        },
    
        error: () => {
          this.mostrarMensajeModal("Ocurrió un error al consultar el backend.");
          return true;
        }
      });
    }
    else {
      this.colaboradorService.buscarLogin(login).subscribe({
        next: (resp) => {
          if (resp.codigoResultado === "1" && resp.resultados.length > 0) {  
            this.mostrarMensajeModal("El usuario indicado ya se encuentra registrado en Thaqhiri.");
          } 
          else {
            // Usuario NO encontrado
            if(evento === 1) {
              //buscar el usuario en el SAA
              this.buscarUsuarioSaa(login);
            }
            else if(evento === 2) {
              //mostrar el modal de confirmnacion
              this.mostrarModalConfirmacion = true;          
            }
          }
        },
    
        error: () => {
          this.mostrarMensajeModal("Ocurrió un error al consultar el backend.");
          return true;
        }
      });
    }

  }
  

}