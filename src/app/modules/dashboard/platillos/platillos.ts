import { Component, inject, OnInit, AfterViewInit, OnDestroy, ViewChild, ChangeDetectorRef, ChangeDetectionStrategy, TrackByFunction } from '@angular/core';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { HttpServices } from '../../../core/services/http/http.service';
import { AuthServices } from '../../../core/services/auth/auth.service';
import { AltaPlatillos } from '../../shared/modales/alta-platillos/alta-platillos';

interface Platillo {
  id: string;
  nombre: string;
  descripcion: string;
  calorias: number;
  tiempo_preparacion: number;
  imagen_url: string;
  es_publico: string | number;
  creador_id: string;
  fecha_creacion: string;
  creador_nombre?: string;
  total_ingredientes?: number;
}

@Component({
  selector: 'app-platillos',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    NgForOf,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule
  ],
  templateUrl: './platillos.html',
  styleUrl: './platillos.scss',
  changeDetection: ChangeDetectionStrategy.Default
})
export class Platillos implements OnInit, AfterViewInit, OnDestroy {
  protected auth = inject(AuthServices);
  protected http = inject(HttpServices);

  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);
  private breakpointObserver = inject(BreakpointObserver);

  loading = false;
  errorMsg: string | null = null;
  search = '';
  isMobile = false;
  isTablet = false;
  mobilePageSize = 6;
  mobileCurrentPage = 0;
  mobileTotalPages = 0;
  mobilePagedData: Platillo[] = [];
  userRole = '';

  displayedColumns: string[] = [
    'imagen',
    'nombre',
    'calorias',
    'tiempo_preparacion',
    'es_publico',
    'fecha_creacion',
    'acciones'
  ];

  displayedColumnsTablet: string[] = [
    'nombre',
    'calorias',
    'tiempo_preparacion',
    'es_publico',
    'acciones'
  ];

  dataSource = new MatTableDataSource<Platillo>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private modalService: NgbModal) { }

  ngOnInit(): void {
    this.userRole = this.auth.getUserRole() || 'USUARIO';
    this.setupResponsive();
    this.obtenerPlatillos();
    this.setupDataSourceConfig();
  }

  setupResponsive(): void {
    this.breakpointObserver.observe([
      Breakpoints.XSmall,
      Breakpoints.Small,
      Breakpoints.Medium
    ]).pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.isMobile = result.breakpoints[Breakpoints.XSmall] || result.breakpoints[Breakpoints.Small];
        this.isTablet = result.breakpoints[Breakpoints.Medium];

        if (this.isMobile) {
          this.updateMobilePagination();
        }

        this.cdr.markForCheck();
      });
  }

  setupDataSourceConfig(): void {
    this.dataSource.filterPredicate = (data: Platillo, filter: string) => {
      const searchStr = filter.toLowerCase();
      return data.nombre.toLowerCase().includes(searchStr) ||
        data.descripcion.toLowerCase().includes(searchStr) ||
        data.calorias.toString().includes(searchStr) ||
        data.tiempo_preparacion.toString().includes(searchStr);
    };

    this.dataSource.sortingDataAccessor = (item: Platillo, prop: string) => {
      switch (prop) {
        case 'nombre': return item.nombre.toLowerCase();
        case 'calorias': return item.calorias;
        case 'tiempo_preparacion': return item.tiempo_preparacion;
        case 'fecha_creacion': return new Date(item.fecha_creacion).getTime();
        default: return item[prop as keyof Platillo] as string;
      }
    };
  }

  ngAfterViewInit(): void {
    if (!this.isMobile) {
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  obtenerPlatillos(): void {
    this.loading = true;
    this.errorMsg = null;
    this.cdr.markForCheck();

    this.http.obtenerPlatillos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp: any) => {
          if (resp?.status === 'success' && resp?.data && Array.isArray(resp.data)) {
            this.dataSource.data = resp.data;

            if (this.isMobile) {
              this.updateMobilePagination();
            }
          } else {
            this.errorMsg = 'Estructura de respuesta inválida';
          }
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loading = false;
          this.errorMsg = err?.error?.message || 'Error al cargar platillos';
          this.cdr.markForCheck();
        }
      });
  }

  applyFilter(value: string): void {
    this.search = value ?? '';
    this.dataSource.filter = this.search.trim().toLowerCase();

    if (!this.isMobile && this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    } else if (this.isMobile) {
      this.mobileCurrentPage = 0;
      this.updateMobilePagination();
    }
    this.cdr.markForCheck();
  }

  clearSearch(): void {
    this.search = '';
    this.dataSource.filter = '';

    if (!this.isMobile && this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    } else if (this.isMobile) {
      this.mobileCurrentPage = 0;
      this.updateMobilePagination();
    }
    this.cdr.markForCheck();
  }

  updateMobilePagination(): void {
    if (!this.isMobile) return;

    const filteredData = this.dataSource.filteredData.length > 0
      ? this.dataSource.filteredData
      : this.dataSource.data;

    this.mobileTotalPages = Math.ceil(filteredData.length / this.mobilePageSize);

    const startIndex = this.mobileCurrentPage * this.mobilePageSize;
    const endIndex = startIndex + this.mobilePageSize;

    this.mobilePagedData = filteredData.slice(startIndex, endIndex);
    this.cdr.markForCheck();
  }

  onMobilePageChange(page: number): void {
    this.mobileCurrentPage = page;
    this.updateMobilePagination();
  }

  previousMobilePage(): void {
    if (this.mobileCurrentPage > 0) {
      this.mobileCurrentPage--;
      this.updateMobilePagination();
    }
  }

  nextMobilePage(): void {
    if (this.mobileCurrentPage < this.mobileTotalPages - 1) {
      this.mobileCurrentPage++;
      this.updateMobilePagination();
    }
  }

  getMobilePageNumbers(): number[] {
    return Array.from({ length: this.mobileTotalPages }, (_, i) => i);
  }

  get filteredData(): Platillo[] {
    return this.dataSource.filteredData.length > 0
      ? this.dataSource.filteredData
      : this.dataSource.data;
  }

  trackById: TrackByFunction<Platillo> = (index: number, item: Platillo): string => {
    return item.id;
  };

  retryLoad(): void {
    this.obtenerPlatillos();
  }

  editarPlatillo(platillo: Platillo): void {
    const modalRef = this.modalService.open(AltaPlatillos, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false,
      centered: true
    });

    modalRef.componentInstance.platilloData = platillo;
    modalRef.componentInstance.isEdit = true;

    modalRef.result.then((result) => {
      if (result === 'updated') {
        this.obtenerPlatillos();
      }
    }).catch(() => { });
  }

  togglePlatilloPublico(platillo: Platillo, esPublico: boolean): void {
    const action = esPublico ? 'hacer público' : 'hacer privado';

    Swal.fire({
      title: '¿Estás seguro?',
      text: `¿Deseas ${action} el platillo "${platillo.nombre}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: `Sí, ${action}`,
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.actualizarEstadoPlatillo(platillo, esPublico);
      }
    });
  }

  private actualizarEstadoPlatillo(platillo: Platillo, esPublico: boolean): void {
    const updateData = {
      ...platillo,
      es_publico: esPublico ? 1 : 0
    };

    this.http.actualizarPlatillo(updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp: any) => {
          if (resp?.status === 'success') {
            platillo.es_publico = esPublico ? 1 : 0;
            this.cdr.markForCheck();

            const Toast = Swal.mixin({
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 3000,
              timerProgressBar: true
            });

            Toast.fire({
              icon: 'success',
              title: `Platillo ${esPublico ? 'público' : 'privado'} correctamente`
            });
          }
        },
        error: (error) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error?.error?.message || 'Error al actualizar el platillo'
          });
        }
      });
  }

  eliminarPlatillo(platillo: Platillo): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: `Esta acción eliminará permanentemente el platillo "${platillo.nombre}"`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.ejecutarEliminacion(platillo);
      }
    });
  }

  private ejecutarEliminacion(platillo: Platillo): void {
    this.http.eliminarPlatillo(Number(platillo.id))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp: any) => {
          if (resp?.status === 'success') {
            this.obtenerPlatillos();

            Swal.fire({
              icon: 'success',
              title: 'Eliminado',
              text: 'El platillo ha sido eliminado correctamente',
              timer: 3000,
              showConfirmButton: false
            });
          }
        },
        error: (error) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error?.error?.message || 'Error al eliminar el platillo'
          });
        }
      });
  }

  getCaloriasBadgeClass(calorias: number): string {
    if (calorias <= 200) return 'badge bg-success';
    if (calorias <= 400) return 'badge bg-warning';
    if (calorias <= 600) return 'badge bg-orange';
    return 'badge bg-danger';
  }

  getTiempoIcon(tiempo: number): string {
    if (tiempo <= 15) return 'bi-clock';
    if (tiempo <= 30) return 'bi-clock-history';
    return 'bi-hourglass-split';
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  get currentDisplayedColumns(): string[] {
    if (this.isMobile) return [];
    if (this.isTablet) return this.displayedColumnsTablet;
    return this.displayedColumns;
  }

  get totalPlatillos(): number {
    return this.dataSource.data.length;
  }

  get platillosPublicos(): number {
    return this.dataSource.data.filter(p => p.es_publico === 1 || p.es_publico === '1').length;
  }

  get platillosPrivados(): number {
    return this.dataSource.data.filter(p => p.es_publico === 0 || p.es_publico === '0').length;
  }

  get promedioCalorias(): number {
    if (this.dataSource.data.length === 0) return 0;
    const total = this.dataSource.data.reduce((sum, p) => sum + p.calorias, 0);
    return Math.round(total / this.dataSource.data.length);
  }

  isPlatilloPublico(platillo: Platillo): boolean {
    return platillo.es_publico === 1 || platillo.es_publico === '1';
  }

  canEditOrDelete(platillo: Platillo): boolean {
    const currentUserId = this.auth.getUser();
    return this.userRole === 'ADMIN' ||
      this.userRole === 'NUTRICIONISTA' ||
      platillo.creador_id === currentUserId;
  }

  openModalAltaPlatillos(item?: any, edit?: boolean): void {
    const modalRef = this.modalService.open(AltaPlatillos, {
      backdrop: 'static',
      size: 'lg',
    });

    if (edit && item) {
      modalRef.componentInstance.platilloData = item;
      modalRef.componentInstance.isEdit = true;
    }

    modalRef.result.then((result) => {
      if (result === 'created' || result === 'updated') {
        this.obtenerPlatillos();
      }
    }).catch(() => { });
  }
}
