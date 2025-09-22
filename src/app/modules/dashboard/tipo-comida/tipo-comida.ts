import { AfterViewInit, Component, ViewChild, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, TrackByFunction, inject } from '@angular/core';
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
import { AltaTipoComida } from '../../shared/modales/alta-tipo-comida/alta-tipo-comida';

interface TipoComida {
  id: string;
  nombre: string;
  status: string;
}

@Component({
  selector: 'app-tipo-comida',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    NgIf
  ],
  templateUrl: './tipo-comida.html',
  styleUrl: './tipo-comida.scss',
  changeDetection: ChangeDetectionStrategy.Default
})
export class TipoComidaComponent implements OnInit, AfterViewInit, OnDestroy {
  private http = inject(HttpServices);
  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);
  private breakpointObserver = inject(BreakpointObserver);

  constructor(private modalService: NgbModal) { }

  loading = false;
  errorMsg: string | null = null;
  search = '';
  isMobile = false;

  displayedColumns: string[] = ['id', 'nombre', 'acciones'];
  dataSource = new MatTableDataSource<TipoComida>([]);

  mobilePageSize = 6;
  mobileCurrentPage = 0;
  mobileTotalPages = 0;
  mobilePagedData: TipoComida[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.setupResponsive();
    this.obtenerTiposComida();
    this.setupFilter();
  }

  setupResponsive(): void {
    this.breakpointObserver.observe([Breakpoints.XSmall, Breakpoints.Small])
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.isMobile = this.breakpointObserver.isMatched(['(max-width: 767px)']);
        this.cdr.markForCheck();
      });
  }

  setupFilter(): void {
    this.dataSource.filterPredicate = (data: TipoComida, filter: string) => {
      const f = (filter ?? '').trim().toLowerCase();
      return (data?.nombre ?? '').toLowerCase().includes(f);
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

  obtenerTiposComida(): void {
    this.loading = true;
    this.http.obtenerTiposComida()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp: any) => {
          const payload = resp?.data ?? [];
          const data: TipoComida[] = Array.isArray(payload) ? payload : [];
          this.dataSource.data = data.map((el: any) => ({
            ...el,
            status: el.status || '0'
          }));
          this.updateMobilePagination();
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.errorMsg = 'No se pudieron cargar los tipos de comida. Intenta nuevamente.';
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

  // 🔹 Paginación móvil
  updateMobilePagination(): void {
    const filteredData = this.dataSource.filteredData.length
      ? this.dataSource.filteredData
      : this.dataSource.data;

    this.mobileTotalPages = Math.ceil(filteredData.length / this.mobilePageSize);
    const startIndex = this.mobileCurrentPage * this.mobilePageSize;
    this.mobilePagedData = filteredData.slice(startIndex, startIndex + this.mobilePageSize);
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

  get filteredData(): TipoComida[] {
    return this.dataSource.filteredData.length ? this.dataSource.filteredData : this.dataSource.data;
  }

  trackById: TrackByFunction<TipoComida> = (index: number, item: TipoComida): string => item?.id ?? index.toString();

  retryLoad(): void {
    this.obtenerTiposComida();
  }

  isTipoActivo(el: TipoComida): boolean {
    return el.status === '1';
  }

  toggleTipoActivo(el: TipoComida, activo: boolean): void {
    const nuevoStatus = activo ? '1' : '0';
    const statusData = { status: parseInt(nuevoStatus) };

    this.http.actualizarStatusTipoComida(parseInt(el.id), statusData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const index = this.dataSource.data.findIndex(t => t.id === el.id);
          if (index !== -1) this.dataSource.data[index].status = nuevoStatus;
          this.updateMobilePagination();
          this.cdr.markForCheck();

          Swal.fire({
            title: '¡Éxito!',
            text: `Tipo de comida "${el.nombre}" ${activo ? 'activado' : 'desactivado'} correctamente`,
            icon: 'success',
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            toast: true,
            background: '#ffffff',
            color: '#374151',
            iconColor: activo ? '#10b981' : '#ef4444',
            customClass: { popup: 'swal-toast-success' }
          });
        },
        error: () => {
          this.obtenerTiposComida();
          Swal.fire({
            title: 'Error',
            text: `No se pudo ${activo ? 'activar' : 'desactivar'} el tipo de comida "${el.nombre}"`,
            icon: 'error',
            position: 'top-end',
            showConfirmButton: false,
            timer: 4000,
            toast: true,
            background: '#ffffff',
            color: '#374151',
            iconColor: '#ef4444',
            customClass: { popup: 'swal-toast-error' }
          });
        }
      });
  }

  // 🔹 Abrir modal de Alta Tipo Comida
  openModalAltaTipoComida(item?: TipoComida, edit?: boolean): void {
    const modalRef = this.modalService.open(AltaTipoComida, {
      backdrop: 'static',
      size: 'md',
      scrollable: true
    });

    modalRef.componentInstance.tipoComidaData = item ?? null;
    modalRef.componentInstance.isEdit = edit ?? false;

    modalRef.result.then((result: any) => {
      if (result?.success) {
        console.log('Datos guardados:', result.data);

        Swal.fire({
          icon: 'success',
          title: `Tipo de comida ${result.isEdit ? 'actualizado' : 'creado'}`,
          text: 'Se guardó correctamente.',
          confirmButtonText: 'Aceptar'
        }).then(() => {
          this.obtenerTiposComida();
        });
      }
    }).catch(() => { });
  }
}
