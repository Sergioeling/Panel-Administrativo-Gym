import { Component, inject, OnInit, AfterViewInit, OnDestroy, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef, TrackByFunction } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthServices } from '../../../core/services/auth/auth.service';
import { HttpServices } from '../../../core/services/http/http.service';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

interface Usuario {
  id: string;
  user_id: string;
  nombre: string;
  correo: string;
  rol: string;
  fecha_registro: string;
  status: string;
}

@Component({
  selector: 'app-lista-users',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule
  ],
  templateUrl: './lista-users.html',
  styleUrl: './lista-users.scss',
  changeDetection: ChangeDetectionStrategy.Default
})
export class ListaUsers implements OnInit, AfterViewInit, OnDestroy {
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
  mobilePagedData: Usuario[] = [];

  displayedColumns: string[] = [
    'nombre',
    'correo',
    'rol',
    'fecha_registro',
    'acciones'
  ];

  displayedColumnsTablet: string[] = [
    'nombre',
    'correo',
    'rol',
    'acciones'
  ];

  dataSource = new MatTableDataSource<Usuario>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.setupResponsive();
    this.obtenerUsuarios();
    this.setupDataSourceConfig();
  }

  setupResponsive(): void {
    this.breakpointObserver.observe([
      Breakpoints.XSmall,
      Breakpoints.Small,
      Breakpoints.Medium
    ]).pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.isMobile = this.breakpointObserver.isMatched(['(max-width: 767px)']);
        this.isTablet = this.breakpointObserver.isMatched(['(min-width: 768px) and (max-width: 1023px)']);

        if (this.isMobile) {
          this.updateMobilePagination();
        }

        this.cdr.markForCheck();
      });
  }

  setupDataSourceConfig(): void {
    this.dataSource.filterPredicate = (data: Usuario, filter: string) => {
      const f = (filter ?? '').trim().toLowerCase();
      return (
        (data?.nombre ?? '').toString().toLowerCase().includes(f) ||
        (data?.correo ?? '').toString().toLowerCase().includes(f) ||
        (data?.rol ?? '').toString().toLowerCase().includes(f) ||
        (data?.user_id ?? '').toString().toLowerCase().includes(f)
      );
    };

    this.dataSource.sortingDataAccessor = (item: Usuario, prop: string) => {
      if (prop === 'fecha_registro') {
        return new Date(item?.fecha_registro ?? '').getTime();
      }
      return (item?.[prop as keyof Usuario] ?? '').toString().toLowerCase();
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

  obtenerUsuarios(): void {
    this.loading = true;
    this.errorMsg = null;
    this.cdr.markForCheck();

    this.http.obtenerUsuarios()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp: any) => {
          try {
            if (resp && resp.status === 'success' && resp.data) {
              const usuarios = resp.data
                .filter((usuario: any) => usuario.rol?.toLowerCase() !== 'admin')
                .map((usuario: any) => ({
                  ...usuario,
                  status: usuario.status || '0'
                }));

              this.dataSource.data = usuarios;

              if (this.isMobile) {
                this.updateMobilePagination();
              }
            } else {
              this.errorMsg = 'Formato de respuesta inválido';
            }
          } catch (error) {
            this.errorMsg = 'Error procesando los datos de usuarios';
          } finally {
            this.loading = false;
            this.cdr.markForCheck(); 
          }
        },
        error: (err) => {
          this.errorMsg = 'Error al cargar usuarios. Intenta nuevamente.';
          this.loading = false;
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
    const pages: number[] = [];
    const totalPages = this.mobileTotalPages;
    const current = this.mobileCurrentPage;

    let start = Math.max(0, current - 2);
    let end = Math.min(totalPages - 1, current + 2);

    if (end - start < 4) {
      if (start === 0) {
        end = Math.min(totalPages - 1, start + 4);
      } else if (end === totalPages - 1) {
        start = Math.max(0, end - 4);
      }
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  get filteredData(): Usuario[] {
    return this.dataSource.filteredData.length
      ? this.dataSource.filteredData
      : this.dataSource.data;
  }

  trackById: TrackByFunction<Usuario> = (index: number, item: Usuario): string => {
    return item?.id ?? index.toString();
  };

  retryLoad(): void {
    this.obtenerUsuarios();
  }


  editarUsuario(usuario: Usuario): void {

  }

  toggleUsuarioActivo(usuario: Usuario, activo: boolean): void {
    if (usuario.rol?.toLowerCase() === 'admin') {
      Swal.fire({
        title: 'Acción no permitida',
        text: 'No se puede modificar el estado de un administrador',
        icon: 'warning',
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        toast: true,
        background: '#ffffff',
        color: '#374151',
        iconColor: '#f59e0b',
        customClass: {
          popup: 'swal-toast-warning'
        }
      });
      return;
    }

    const nuevoStatus = activo ? '1' : '0';
    const statusData = {
      status: parseInt(nuevoStatus) 
    };

    this.http.actualizarStatusUsuario(parseInt(usuario.id), statusData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const index = this.dataSource.data.findIndex(u => u.id === usuario.id);
          if (index !== -1) {
            this.dataSource.data[index].status = nuevoStatus;
            if (this.isMobile) {
              this.updateMobilePagination();
            }

            this.cdr.markForCheck();
          }
          Swal.fire({
            title: '¡Éxito!',
            text: `Usuario ${usuario.nombre} ${activo ? 'activado' : 'desactivado'} correctamente`,
            icon: 'success',
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            toast: true,
            background: '#ffffff',
            color: '#374151',
            iconColor: activo ? '#10b981' : '#ef4444',
            customClass: {
              popup: 'swal-toast-success'
            }
          });
        },
        error: (err) => {
          this.obtenerUsuarios();
          Swal.fire({
            title: 'Error',
            text: `No se pudo ${activo ? 'activar' : 'desactivar'} el usuario ${usuario.nombre}`,
            icon: 'error',
            position: 'top-end',
            showConfirmButton: false,
            timer: 4000,
            timerProgressBar: true,
            toast: true,
            background: '#ffffff',
            color: '#374151',
            iconColor: '#ef4444',
            customClass: {
              popup: 'swal-toast-error'
            }
          });
        }
      });
  }

  getRolBadgeClass(rol: string): string {
    switch (rol?.toLowerCase()) {
      case 'admin':
        return 'role-badge admin';
      case 'nutricionista':
        return 'role-badge nutricionista';
      case 'recepcionista':
        return 'role-badge recepcionista';
      case 'usuario':
        return 'role-badge usuario';
      default:
        return 'role-badge default';
    }
  }

  getRolIcon(rol: string): string {
    switch (rol?.toLowerCase()) {
      case 'admin':
        return 'bi-shield-check';
      case 'nutricionista':
        return 'bi-heart-pulse';
      case 'recepcionista':
        return 'bi-person-workspace';
      case 'usuario':
        return 'bi-person';
      default:
        return 'bi-person-circle';
    }
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '—';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  get currentDisplayedColumns(): string[] {
    if (this.isTablet) {
      return this.displayedColumnsTablet;
    }
    return this.displayedColumns;
  }


  get totalUsuarios(): number {
    return this.dataSource.data.length;
  }

  get usuariosActivos(): number {
    return this.dataSource.data.filter(u => 
      u.status === '1' && u.rol?.toLowerCase() !== 'admin'
    ).length;
  }

  get totalNutricionistas(): number {
    return this.dataSource.data.filter(u => u.rol?.toLowerCase() === 'nutricionista').length;
  }

  get usuariosPorRol(): { [key: string]: number } {
    return this.dataSource.data.reduce((acc, usuario) => {
      const rol = usuario.rol || 'Sin rol';
      acc[rol] = (acc[rol] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
  }

  isUsuarioActivo(usuario: Usuario): boolean {
    return usuario.status === '1';
  }
}
