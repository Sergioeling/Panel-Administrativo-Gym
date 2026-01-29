import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { RevisionService } from './revision.service';
import { AltaPlatillos } from '../../shared/modales/alta-platillos/alta-platillos';
import { VistaDocumentos } from '../../shared/modales/vista-documentos/vista-documentos';
import { AltaAlimento } from '../../shared/modales/alta-alimento/alta-alimento';
import Swal from 'sweetalert2';

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

  totalSolicitudes = 0;
  solicitudesNutricionistas = 0;
  solicitudesPlatillos = 0;

  // ===== NUEVO =====
  solicitudesAlimentos = 0;
  // =================

  solicitudesPendientes = 0;

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

  // ===== NUEVO: ALIMENTOS =====
  displayedColumnsAlimentos = [
    'nombre',
    'detalles',
    'categoria',
    'nutricionista',
    'estado',
    'acciones'
  ];

  dataAlimentos = new MatTableDataSource<any>([]);
  @ViewChild('paginatorAlimentos') paginatorAlimentos!: MatPaginator;
  // ============================

  constructor(
    private revisionService: RevisionService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.cargarNutricionistasPendientes();
    this.cargarPlatillosPendientes();

    // ===== NUEVO =====
    this.cargarAlimentosPendientes();
    // =================
  }

  ngAfterViewInit(): void {
    this.dataNutricionistas.paginator = this.paginatorNutri;
    this.dataPlatillos.paginator = this.paginatorPlat;

    // ===== NUEVO =====
    this.dataAlimentos.paginator = this.paginatorAlimentos;
    // =================
  }

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
              Number(p.status) === 2
                ? 'pendiente'
                : Number(p.status) === 1
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

  // ===== NUEVO: ALIMENTOS =====
  cargarAlimentosPendientes(): void {
    this.revisionService.getAlimentosPendientes().subscribe({
      next: (resp: any) => {
        if (resp.status === 'success') {
          this.dataAlimentos.data = resp.data.map((a: any) => ({
            id: a.alimento_id,
            nombre: a.nombre,
            categoria: a.categoria,
            nutricionista: a.nutricionista,
            estado:
              Number(a.status) === 2
                ? 'pendiente'
                : Number(a.status) === 1
                ? 'aprobado'
                : 'rechazado'
          }));

          this.calcularTotales();
        }
      },
      error: (err: any) => {
        console.error('Error al cargar alimentos pendientes', err);
      }
    });
  }
  // ============================

  calcularTotales(): void {
    this.solicitudesNutricionistas = this.dataNutricionistas.data.length;
    this.solicitudesPlatillos = this.dataPlatillos.data.length;

    // ===== NUEVO =====
    this.solicitudesAlimentos = this.dataAlimentos.data.length;
    // =================

    this.totalSolicitudes =
      this.solicitudesNutricionistas +
      this.solicitudesPlatillos +
      this.solicitudesAlimentos;

    this.solicitudesPendientes = this.totalSolicitudes;
  }

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
    Swal.fire({
      title: 'Rechazar platillo',
      text: 'Escribe el motivo del rechazo',
      input: 'textarea',
      inputPlaceholder: 'Motivo del rechazo...',
      inputAttributes: {
        'aria-label': 'Motivo del rechazo'
      },
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return 'El motivo es obligatorio';
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const motivo = result.value;

        this.revisionService
          .revisionPlatillo(item.id, 0, motivo)
          .subscribe({
            next: () => {
              Swal.fire({
                icon: 'success',
                title: 'Platillo rechazado',
                text: 'Se notificó al nutricionista',
                timer: 2500,
                showConfirmButton: false
              });

              this.cargarPlatillosPendientes();
            },
            error: () => {
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo rechazar el platillo'
              });
            }
          });
      }
    });
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

    modalRef.result
      .then((result) => {
        if (result) {
          this.cargarNutricionistasPendientes();
        }
      })
      .catch(() => {});
  }

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

  rechazarNutricionista(item: any): void {
    Swal.fire({
      title: 'Rechazar solicitud',
      text: 'Escribe el motivo del rechazo',
      input: 'textarea',
      inputPlaceholder: 'Motivo del rechazo...',
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return 'El motivo es obligatorio';
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const motivo = result.value;

        this.revisionService
          .rechazarNutricionista(item.id, motivo)
          .subscribe({
            next: () => {
              Swal.fire({
                icon: 'success',
                title: 'Solicitud rechazada',
                text: 'El nutricionista fue notificado',
                timer: 2500,
                showConfirmButton: false
              });

              this.cargarNutricionistasPendientes();
            },
            error: () => {
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo rechazar la solicitud'
              });
            }
          });
      }
    });
  }


 verDetalleAlimento(item: any): void {
  this.revisionService.getAlimentoDetalle(item.id).subscribe({
    next: (resp: any) => {
      const alimentoCompleto = resp?.data ?? resp;

      const modalRef = this.modalService.open(AltaAlimento, {
          backdrop: 'static',
          size: 'lg',
          scrollable: true
        });

        modalRef.componentInstance.readOnly = true; // 👈 PRIMERO
        modalRef.componentInstance.isEdit = true;
        modalRef.componentInstance.alimentoData = alimentoCompleto;

    },
    error: (err: any) => {
      console.error('Error al cargar detalle del alimento', err);
    }
  });
}



  // ===== NUEVO: ACCIONES ALIMENTOS (VACÍAS A PROPÓSITO) =====
  aprobarAlimento(item: any): void {
    // pendiente de implementar
  }

  rechazarAlimento(item: any): void {
    // pendiente de implementar
  }
}
