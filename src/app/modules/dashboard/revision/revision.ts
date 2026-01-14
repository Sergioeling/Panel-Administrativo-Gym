import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';

import { RevisionService } from './revision.service';

@Component({
  selector: 'app-revision',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule
  ],
  templateUrl: './revision.html',
  styleUrls: ['./revision.scss']
})
export class RevisionComponent implements OnInit, AfterViewInit {

  /* =========================
   *  TARJETAS
   * ========================= */
  totalSolicitudes = 0;
  solicitudesNutricionistas = 0;
  solicitudesPlatillos = 0;
  solicitudesPendientes = 0;

  /* =========================
   *  TABLA NUTRICIONISTAS
   * ========================= */
  displayedColumnsNutricionistas = [
    'nombre',
    'email',
    'archivos',
    'fecha',
    'estado',
    'acciones'
  ];

  dataNutricionistas = new MatTableDataSource<any>([]);

  @ViewChild('paginatorNutri') paginatorNutri!: MatPaginator;

  /* =========================
   *  TABLA PLATILLOS (DESPUÉS)
   * ========================= */
  displayedColumnsPlatillos = [
    'platillo',
    'nutricionista',
    'fecha',
    'estado',
    'acciones'
  ];

  dataPlatillos: any[] = [];

  constructor(private revisionService: RevisionService) {}

  ngOnInit(): void {
    this.cargarNutricionistasPendientes();
  }

  ngAfterViewInit(): void {
    this.dataNutricionistas.paginator = this.paginatorNutri;
  }

  /* =========================
   *  API
   * ========================= */
  cargarNutricionistasPendientes(): void {
    this.revisionService.getNutricionistasPendientes().subscribe({
      next: (resp) => {
        if (resp.status === 'success') {

          this.dataNutricionistas.data = resp.data.map((n: any) => ({
            id: n.usuario_id,
            nombre: n.nombre,
            email: n.correo,
            archivos: Number(n.total_documentos) > 0,
            fecha: n.fecha_ultima_subida,
            estado: 'pendiente'
          }));

          this.calcularTotales();
        }
      },
      error: (err) => {
        console.error('Error al cargar nutricionistas', err);
      }
    });
  }

  /* =========================
   *  MÉTRICAS
   * ========================= */
  calcularTotales(): void {
    this.solicitudesNutricionistas = this.dataNutricionistas.data.length;
    this.solicitudesPlatillos = this.dataPlatillos.length;

    this.totalSolicitudes =
      this.solicitudesNutricionistas + this.solicitudesPlatillos;

    this.solicitudesPendientes = this.dataNutricionistas.data.length;
  }

  /* =========================
   *  ACCIONES
   * ========================= */
  aprobar(item: any): void {
    console.log('Aprobar nutricionista', item);
  }

  rechazar(item: any): void {
    console.log('Rechazar nutricionista', item);
  }

  verArchivos(item: any): void {
    console.log('Ver archivos de', item);
  }
}
