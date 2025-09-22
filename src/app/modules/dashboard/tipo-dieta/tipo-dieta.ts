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
import { AltaTipoDieta } from '../../shared/modales/alta-tipo-dieta/alta-tipo-dieta'; // 👈 importa tu modal

@Component({
  selector: 'app-tipo-dieta',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    NgIf
  ],
  templateUrl: './tipo-dieta.html',
  styleUrl: './tipo-dieta.scss',
  changeDetection: ChangeDetectionStrategy.Default
})
export class TipoDietaComponent implements OnInit, AfterViewInit, OnDestroy {
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
  dataSource = new MatTableDataSource<any>([]);

  // Mobile
  mobilePageSize = 6;
  mobileCurrentPage = 0;
  mobileTotalPages = 0;
  mobilePagedData: any[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.setupResponsive();
    this.obtenerTiposDieta();
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
    this.dataSource.filterPredicate = (data: any, filter: string) => {
      const f = (filter ?? '').trim().toLowerCase();
      return (data?.nombre ?? '').toString().toLowerCase().includes(f);
    };
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    if (this.sort) {
      this.sort.active = 'id';
      this.sort.direction = 'asc';
      this.sort.sortChange.emit({ active: 'id', direction: 'asc' });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  obtenerTiposDieta(): void {
    this.loading = true;
    this.http.obtenerTiposDieta()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp: any) => {
          const payload = resp?.data ?? resp;
          let data: any[] = Array.isArray(payload) ? payload : (payload ? [payload] : []);
          data = data.sort((a, b) => Number(a.id) - Number(b.id));
          this.dataSource.data = data;
          this.updateMobilePagination();
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.errorMsg = 'No se pudieron cargar los tipos de dieta. Intenta nuevamente.';
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

  // Mobile pagination
  updateMobilePagination(): void {
    const filteredData = this.dataSource.filteredData.length
      ? this.dataSource.filteredData
      : this.dataSource.data;
    this.mobileTotalPages = Math.ceil(filteredData.length / this.mobilePageSize);
    const startIndex = this.mobileCurrentPage * this.mobilePageSize;
    this.mobilePagedData = filteredData.slice(startIndex, startIndex + this.mobilePageSize);
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

  get filteredData(): any[] {
    return this.dataSource.filteredData.length
      ? this.dataSource.filteredData
      : this.dataSource.data;
  }

  trackById: TrackByFunction<any> = (index: number, item: any): string =>
    (item?.id ?? index).toString();

  retryLoad(): void {
    this.obtenerTiposDieta();
  }

  isDietaActiva(dieta: any): boolean {
    return String(dieta.status) === '1';
  }

  toggleDietaActiva(dieta: any, activo: boolean): void {
    const nuevoStatus = activo ? '1' : '0';
    const statusData = { status: parseInt(nuevoStatus) };
    this.http.actualizarStatusDieta(parseInt(dieta.id), statusData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const index = this.dataSource.data.findIndex(d => d.id === dieta.id);
          if (index !== -1) this.dataSource.data[index].status = nuevoStatus;
          this.updateMobilePagination();
          this.cdr.markForCheck();
          Swal.fire({
            title: '¡Éxito!',
            text: `La dieta "${dieta.nombre}" fue ${activo ? 'activada' : 'desactivada'} correctamente`,
            icon: 'success',
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            toast: true,
            background: '#fff',
            color: '#374151',
            iconColor: activo ? '#10b981' : '#ef4444',
            customClass: { popup: 'swal-toast-success' }
          });
        },
        error: () => {
          this.obtenerTiposDieta();
          Swal.fire({
            title: 'Error',
            text: `No se pudo ${activo ? 'activar' : 'desactivar'} la dieta "${dieta.nombre}"`,
            icon: 'error',
            position: 'top-end',
            showConfirmButton: false,
            timer: 4000,
            toast: true,
            background: '#fff',
            color: '#374151',
            iconColor: '#ef4444',
            customClass: { popup: 'swal-toast-error' }
          });
        }
      });
  }

  // 🔹 Abrir modal de Alta Tipo Dieta
  openModalAltaTipoDieta(item?: any, edit?: boolean): void {
    const modalRef = this.modalService.open(AltaTipoDieta, {
      backdrop: 'static',
      size: 'md',
      scrollable: true
    });

    modalRef.componentInstance.tipoDietaData = item;
    modalRef.componentInstance.isEdit = edit ?? false;

    modalRef.result.then((result: any) => {
      if (result?.success) {
        console.log('Datos guardados:', result.data);
        this.obtenerTiposDieta();
      }
    }).catch(() => { });
  }
}
