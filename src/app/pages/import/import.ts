import { Component, OnDestroy } from '@angular/core';
import { ImportService } from '../../services/import/import.service';
import { interval, Subscription, switchMap } from 'rxjs';
import { ImportJobStatus } from '../../shared/models/import-job.model';
import { Output, EventEmitter } from '@angular/core';
import { Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-import',
  templateUrl: './import.html',
  styleUrl: './import.css',
  imports: [CommonModule]
})
export class ImportComponent implements OnDestroy, OnInit{

  jobId?: number;
  status?: ImportJobStatus;
  pollingSub?: Subscription;
  
  //cargando = false;

  @Input() archivo?: File;
  @Input() jobIdExistente?: number;
  @Output() finalizado = new EventEmitter<ImportJobStatus>();


  constructor(private importService: ImportService) {}

  ngOnInit() {

    //Evalua si hay una carga en proceso existente
    if (this.jobIdExistente) {
      this.jobId = this.jobIdExistente;
      this.iniciarPolling();
      return;
    }
    
    if (this.archivo) {
      this.iniciar();
    }
  }


  iniciar() {

    if (!this.archivo) return;

    this.status = {
          id: null,
          estado: 'INICIANDO',
          porcentaje: 0,
          filasProcesadas: 0,
          totalFilas: 0,
          mensaje: '',
          horasRestantes: 0,
          minutosRestantes: 0,
          segundosRestantes: 0
        };    
    
    //this.cargando = true;

    this.importService.iniciarImportacion(this.archivo).subscribe({
      next: jobId => {
        this.jobId = jobId;

        // 🔥 Guardar en localStorage, para prevenir reacarga del navegador
        localStorage.setItem('importJobId', jobId.toString());
        localStorage.setItem('importJobActivo', 'true');

        this.iniciarPolling();
      },
      error: err => {
        this.status = {
          ...this.status!,
          estado: 'ERROR',
          mensaje: 'Error al iniciar la importación. Intente nuevamente.'
        };

        this.finalizado.emit(this.status);
      }
    });
  }

  iniciarPolling() {

    this.status = {
          id: null,
          estado: 'ENVIANDO ARCHIVO',
          porcentaje: 0,
          filasProcesadas: 0,
          totalFilas: 0,
          mensaje: '',
          horasRestantes: 0,
          minutosRestantes: 0,
          segundosRestantes: 0
        }; 

    if (!this.jobId) return;

    this.pollingSub = interval(5000)
    .pipe(
      switchMap(() => this.importService.obtenerEstado(this.jobId!))
    )
    .subscribe({
      next: status => {
        this.status = status;
        if (status.estado === 'COMPLETADO' || status.estado === 'ERROR') {
          // 🔥 Limpiar storage
          localStorage.removeItem('importJobId');
          localStorage.removeItem('importJobActivo');

          this.detenerPolling();
          this.finalizado.emit(status);
        }
      },
      error: err => {
        this.detenerPolling();
        this.status = {
          ...this.status!,
          estado: 'ERROR',
          mensaje: 'Error al consultar el estado de la importación.'
        };

        this.finalizado.emit(this.status);
      }
    });
  }

  detenerPolling() {
    this.pollingSub?.unsubscribe();
  }

  ngOnDestroy() {
    this.detenerPolling();
  }
}