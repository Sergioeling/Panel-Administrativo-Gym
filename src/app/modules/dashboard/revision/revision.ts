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
   *  TABLA PLATILLOS
   * ========================= */
  displayedColumnsPlatillos = [
    'platillo',
    'detalles',
    'nutricionista',
    'tiempo',
    'estado',
    'acciones'
  ];

  dataPlatillos = new MatTableDataSource<any>([]);
  @ViewChild('paginatorPlat') paginatorPlat!: MatPaginator;

  constructor(private revisionService: RevisionService) {}

  ngOnInit(): void {
    this.cargarNutricionistasPendientes();
    this.cargarPlatillosPendientes(); // ⬅️ YA ACTIVO
  }

  ngAfterViewInit(): void {
    this.dataNutricionistas.paginator = this.paginatorNutri;
    this.dataPlatillos.paginator = this.paginatorPlat;
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

  cargarPlatillosPendientes(): void {
    this.revisionService.getPlatillosPendientes().subscribe({
      next: (resp) => {
        if (resp.status === 'success') {
          this.dataPlatillos.data = resp.data.map((p: any) => ({
            id: p.platillo_id,
            platillo: p.platillo,
            nutricionista: p.nutricionista,
            tiempo: `${p.tiempo_preparacion} min`,
            estado: 'pendiente'
          }));

          this.calcularTotales();
        }
      },
      error: (err) => {
        console.error('Error al cargar platillos pendientes', err);
      }
    });
  }

  /* =========================
   *  MÉTRICAS
   * ========================= */
  calcularTotales(): void {
    this.solicitudesNutricionistas = this.dataNutricionistas.data.length;
    this.solicitudesPlatillos = this.dataPlatillos.data.length;

    this.totalSolicitudes =
      this.solicitudesNutricionistas + this.solicitudesPlatillos;

    this.solicitudesPendientes =
      this.solicitudesNutricionistas + this.solicitudesPlatillos;
  }

  /* =========================
   *  ACCIONES
   * ========================= */
  aprobar(item: any): void {
    console.log('Aprobar', item);
  }

  rechazar(item: any): void {
    console.log('Rechazar', item);
  }

  verArchivos(item: any): void {
    console.log('Ver archivos de', item);
  }

  /* =========================
   *  DETALLES PLATILLO
   * ========================= */
  verDetallesPlatillo(platillo: any): void {
    console.log('Ver detalles del platillo ID:', platillo.id);
  }
}
