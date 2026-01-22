import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { RevisionService } from './revision.service';
import { AltaPlatillos } from '../../shared/modales/alta-platillos/alta-platillos';
import { VistaDocumentos } from '../../shared/modales/vista-documentos/vista-documentos';


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

  constructor(
    private revisionService: RevisionService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.cargarNutricionistasPendientes();
    this.cargarPlatillosPendientes();
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
          estado:
            p.status === 2
              ? 'pendiente'
              : p.status === 1
              ? 'aprobado'
              : 'rechazado'
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
  this.revisionService
    .revisionPlatillo(item.id, 1)
    .subscribe({
      next: () => {
        this.cargarPlatillosPendientes();
      },
      error: (err) => {
        console.error('Error al aprobar platillo', err);
      }
    });
}


  rechazar(item: any): void {
    console.log('Rechazar', item);
  }

  verArchivos(item: any): void {
      const modalRef = this.modalService.open(
        VistaDocumentos,
        {
          size: 'lg',
          backdrop: 'static',
          keyboard: false
        }
      );

      modalRef.componentInstance.usuario = {
        id: item.id,
        nombre: item.nombre,
        email: item.email
      };

      // 🔥 CUANDO SE CIERRA EL MODAL
      modalRef.result
        .then((result) => {
          if (result) {
            // Recargar solicitudes de nutricionistas
            this.cargarNutricionistasPendientes();
          }
        })
        .catch(() => {
          // Modal cerrado sin acción (ESC, X, etc.)
        });
    }



  /* =========================
   *  DETALLES PLATILLO (MODAL)
   * ========================= */
  verDetallesPlatillo(platillo: any): void {
    const modalRef = this.modalService.open(AltaPlatillos, {
      size: 'xl',
      backdrop: 'static',
      keyboard: false,
      scrollable: true
    });

    modalRef.componentInstance.platilloData = {
      id: platillo.id
    };

    modalRef.componentInstance.isEdit = true;
    modalRef.componentInstance.isViewOnly = true;
  }
}
