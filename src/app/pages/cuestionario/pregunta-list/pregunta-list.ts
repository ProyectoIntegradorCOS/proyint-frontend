import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PreguntaFormComponent } from '../pregunta-form/pregunta-form';
import { Pregunta } from '../../../shared/models/pregunta.model';
import { PreguntaService } from '../../../services/pregunta/pregunta.service';
import { TipoPreguntaPipe } from '../../../pipes/tipoPregunta.pipe';
import { SessionService } from '../../../services/session/session.service';

@Component({
  selector: 'app-pregunta-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PreguntaFormComponent, TipoPreguntaPipe],
  templateUrl: './pregunta-list.html',
  styleUrl: './pregunta-list.css',
})
export class PreguntaListComponent implements OnInit{

  @Input() idCuestionario!: number;
  preguntas: Pregunta[] = [];
  mostrarForm = false;
  seleccionada?: Pregunta;
  preguntaAEliminar?: Pregunta;

  modo: 'registro' | 'edicion' = 'registro';

  //Permisos
  mostrarEditar: boolean = false;


  constructor(private service: PreguntaService, private sessionService: SessionService) {}

  ngOnInit() {

    //Permisos    
    this.mostrarEditar = this.sessionService.tienePermiso("cuestionario.editar");

    if(this.idCuestionario) {
      this.modo = 'edicion';
    }

    this.cargar();
  }

  cargar() {
  this.service.listarPorCuestionario(this.idCuestionario)
    .subscribe(r => {

      //console.log('Pregunta-list, r:', JSON.stringify(r,null,2));
      
      this.preguntas = r;
    });
}

  nuevo() {
    this.seleccionada = undefined;
    this.mostrarForm = true;
  }

  editar(p: Pregunta) {
    this.seleccionada = p;
    this.mostrarForm = true;
  }


  eliminar(p: Pregunta) {
    this.preguntaAEliminar = p;
  }

  cancelarEliminar() {
    this.preguntaAEliminar = undefined;
  }

  confirmarEliminar() {
    const p = this.preguntaAEliminar!;
    
    this.service.eliminar(p.id!).subscribe(() => {

      // quitar del arreglo
      this.preguntas = this.preguntas.filter(x => x.id !== p.id);

      // recalcular orden
      this.recalcularOrden();

      // guardar nuevo orden
      this.service.actualizarOrden(this.preguntas).subscribe();

      // cerrar modal
      this.preguntaAEliminar = undefined;
    });
  }


  cerrar(recargar: boolean) {
    this.mostrarForm = false;
    if (recargar) this.cargar();
  }


  subir(index: number) {
  if (index === 0) return;

  this.intercambiar(index, index - 1);
  }

  bajar(index: number) {
    if (index === this.preguntas.length - 1) return;

    this.intercambiar(index, index + 1);
  }

  intercambiar(i: number, j: number) {
    const temp = this.preguntas[i];
    this.preguntas[i] = this.preguntas[j];
    this.preguntas[j] = temp;

    this.recalcularOrden();
    this.guardarOrden();
  }

  recalcularOrden() {
    this.preguntas.forEach((p, index) => {
      p.orden = index + 1;
    });
  }

  guardarOrden() {
    this.service.actualizarOrden(this.preguntas).subscribe();
  }


}
