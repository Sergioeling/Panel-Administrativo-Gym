import {
  AfterViewInit,
  Component,
  ViewChild,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  TrackByFunction,
  inject
} from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { Subject, takeUntil } from 'rxjs';
import { HttpServices } from '../../../core/services/http/http.service';
import Swal from 'sweetalert2';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AltaTipoObjetivo } from '../../shared/modales/alta-tipo-objetivo/alta-tipo-objetivo';

@Component({
  selector: 'app-tipo-objetivo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    NgIf
  ],
  templateUrl: './tipo-objetivo.html',
  styleUrl: './tipo-objetivo.scss',
  changeDetection: ChangeDetectionStrategy.Default
})
export class TipoObjetivoComponent implements OnInit, AfterViewInit, OnDestroy {
  private http = inject(HttpServices);
  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);
  private breakpointObserver = inject(BreakpointObserver);

  constructor(private modalService: NgbModal) { }

  loading = false;
  errorMsg: string | null = null;
  search = '';
  isMobile = false;

  // columnas para tabla desktop
  displayedColumns: string[] = ['id', 'nombre', 'editar', 'acciones'];
  dataSource = new MatTableDataSource<any>([]);

  // paginación móvil
  mobilePageSize = 6;
  mobileCurrentPage = 0;
  mobileTotalPages = 0;
  mobilePagedData: any[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;


  ngOnInit(): void {
    this.setupResponsive();
    this.obtenerTiposObjetivos();
    this.setupFilter();
  }

  setupResponsive(): void {
    this.breakpointObserver
      .observe([Breakpoints.XSmall, Breakpoints.Small])
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.isMobile = this.breakpointObserver.isMatched(['(max-width: 767px)']);
        this.cdr.markForCheck();
      });
  }

  setupFilter(): void {
    this.dataSource.filterPredicate = (data: any, filter: string) => {
      const f = (filter ?? '').trim().toLowerCase();
      return (data?.nombre ?? '').toString().toLowerCase().includes(f);
    };
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  obtenerTiposObjetivos(): void {
    this.loading = true;
    this.http
      .obtenerTiposObjetivos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp: any) => {
          const payload = resp?.data ?? resp;
          let data: any[] = Array.isArray(payload) ? payload : payload ? [payload] : [];
          data = data.sort((a, b) => Number(a.id) - Number(b.id));

          this.dataSource.data = data.map(o => ({
            ...o,
            status: (o.status === 1 || o.status === '1') ? '1' : '0'
          }));

          this.updateMobilePagination();
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.errorMsg = 'No se pudieron cargar los tipos de objetivos. Intenta nuevamente.';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  applyFilter(value: string): void {
    this.search = value ?? '';
    this.dataSource.filter = this.search.trim().toLowerCase();
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
    this.updateMobilePagination();
    this.cdr.markForCheck();
  }

  clearSearch(): void {
    this.search = '';
    this.dataSource.filter = '';
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
    this.updateMobilePagination();
    this.cdr.markForCheck();
  }

  get filteredData(): any[] {
    return this.dataSource.filteredData.length
      ? this.dataSource.filteredData
      : this.dataSource.data;
  }

  retryLoad(): void {
    this.obtenerTiposObjetivos();
  }

  toggleObjetivoActivo(objetivo: any, activo: boolean): void {
    const nuevoStatus = activo ? 1 : 0;
    const statusData = { status: nuevoStatus };

    this.http
      .actualizarStatusObjetivo(parseInt(objetivo.id), statusData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const index = this.dataSource.data.findIndex(o => o.id === objetivo.id);
          if (index !== -1) {
            this.dataSource.data[index].status = nuevoStatus.toString();
          }
          this.updateMobilePagination();
          this.cdr.markForCheck();

          Swal.fire({
            title: '¡Éxito!',
            text: `Objetivo "${objetivo.nombre}" fue ${activo ? 'activado' : 'desactivado'} correctamente`,
            icon: 'success',
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            toast: true,
            background: '#fff',
            color: '#374151',
            iconColor: activo ? '#10b981' : '#ef4444',
            customClass: { popup: 'swal-toast-success' }
          });
        },
        error: () => {
          this.obtenerTiposObjetivos();
          Swal.fire({
            title: 'Error',
            text: `No se pudo ${activo ? 'activar' : 'desactivar'} el objetivo "${objetivo.nombre}"`,
            icon: 'error',
            position: 'top-end',
            showConfirmButton: false,
            timer: 4000,
            timerProgressBar: true,
            toast: true,
            background: '#fff',
            color: '#374151',
            iconColor: '#ef4444',
            customClass: { popup: 'swal-toast-error' }
          });
        }
      });
  }

  isObjetivoActivo(objetivo: any): boolean {
    return String(objetivo.status) === '1';
  }

  openModalAltaTipoObjetivo(item?: any, edit?: boolean): void {
    const modalRef = this.modalService.open(AltaTipoObjetivo, {
      backdrop: 'static',
      size: 'md',
      scrollable: true
    });

    modalRef.componentInstance.tipoObjetivoData = item;
    modalRef.componentInstance.isEdit = edit ?? false;

    modalRef.result
      .then((result: any) => {
        if (result?.success && result?.data) {
          if (edit) {
            const index = this.dataSource.data.findIndex(o => o.id === result.data.id);
            if (index !== -1) {
              this.dataSource.data[index] = {
                ...this.dataSource.data[index],
                ...result.data
              };
            }
          } else {
            this.dataSource.data = [
              ...this.dataSource.data,
              { ...result.data, status: '1' }

            ];
          }
          this.dataSource._updateChangeSubscription();
          this.cdr.detectChanges();
        }
      })
      .catch(() => { });
  }

  // 📌 TrackBy para *ngFor móvil
  trackById: TrackByFunction<any> = (index: number, item: any): string =>
    (item?.id ?? index).toString();

  // 📌 Paginación móvil
  updateMobilePagination(): void {
    const filteredData = this.dataSource.filteredData.length
      ? this.dataSource.filteredData
      : this.dataSource.data;
    this.mobileTotalPages = Math.ceil(filteredData.length / this.mobilePageSize);
    const startIndex = this.mobileCurrentPage * this.mobilePageSize;
    this.mobilePagedData = filteredData.slice(startIndex, startIndex + this.mobilePageSize);
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

  onMobilePageChange(page: number): void {
    this.mobileCurrentPage = page;
    this.updateMobilePagination();
  }

  getMobilePageNumbers(): number[] {
    const pages: number[] = [];
    const totalPages = this.mobileTotalPages;
    const current = this.mobileCurrentPage;
    let start = Math.max(0, current - 2);
    let end = Math.min(totalPages - 1, current + 2);

    if (end - start < 4) {
      if (start === 0) end = Math.min(totalPages - 1, start + 4);
      else if (end === totalPages - 1) start = Math.max(0, end - 4);
    }
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  // 📌 Getters estadísticos
  get totalTipos(): number {
    return this.dataSource.data.length;
  }
  get tiposActivos(): number {
    return this.dataSource.data.filter(t => String(t.status) === '1').length;
  }
  get tiposInactivos(): number {
    return this.dataSource.data.filter(t => String(t.status) === '0').length;
  }
  get tiposFiltrados(): number {
    return this.filteredData.length;
  }

  //---Paginador----
  get pagedData(): any[] {
    const data = this.dataSource.filteredData.length
      ? this.dataSource.filteredData
      : this.dataSource.data;

    if (!this.paginator) return data;

    const startIndex = this.paginator.pageIndex * this.paginator.pageSize;
    return data.slice(startIndex, startIndex + this.paginator.pageSize);
  }

  get currentPage(): number {
    return this.paginator ? this.paginator.pageIndex + 1 : 1;
  }

  get totalPages(): number {
    return this.paginator
      ? Math.ceil(this.dataSource.filteredData.length / this.paginator.pageSize)
      : 1;
  }

  // Ir a la primera página
  goToFirstPage(): void {
    if (this.paginator) {
      this.paginator.pageIndex = 0;
      this.emitirCambioPagina();
    }
  }

  // Ir a la página anterior
  goToPreviousPage(): void {
    if (this.paginator && this.paginator.pageIndex > 0) {
      this.paginator.pageIndex--;
      this.emitirCambioPagina();
    }
  }

  // Ir a la página siguiente
  goToNextPage(): void {
    if (this.paginator && this.paginator.pageIndex < this.totalPages - 1) {
      this.paginator.pageIndex++;
      this.emitirCambioPagina();
    }
  }

  // Ir a la última página
  goToLastPage(): void {
    if (this.paginator) {
      this.paginator.pageIndex = this.totalPages - 1;
      this.emitirCambioPagina();
    }
  }

  // 🔹 Método auxiliar para forzar el refresh del paginador
  private emitirCambioPagina(): void {
    this.paginator.page.next({
      pageIndex: this.paginator.pageIndex,
      pageSize: this.paginator.pageSize,
      length: this.dataSource.filteredData.length
    });
    this.cdr.markForCheck();
  }
}
