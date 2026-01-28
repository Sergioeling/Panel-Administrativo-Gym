import { Component, inject, OnInit, AfterViewInit, OnDestroy, ViewChild, ChangeDetectorRef, ChangeDetectionStrategy, TrackByFunction } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
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
  status: string | number;
  creador_id: string;
  fecha_creacion: string;
  creador_nombre?: string;
  total_ingredientes?: number;
  usuarios_asignados?: Array<{
    usuario_id: number;
    usuario_nombre: string;
    dia_semana: string;
    tipo_comida_id: number;
  }>;
}

@Component({
  selector: 'app-platillos',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    NgFor,
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
  currentUserId = '';

  displayedColumns: string[] = [
    'imagen',
    'nombre',
    'creador',
    'calorias',
    'tiempo_preparacion',
    'status',
    'acciones'
  ];

  displayedColumnsTablet: string[] = [
    'nombre',
    'creador',
    'calorias',
    'tiempo_preparacion',
    'status',
    'acciones'
  ];

  dataSource = new MatTableDataSource<Platillo>([]);
  dataSourceFiltrados = new MatTableDataSource<Platillo>([]);
  platillosGeneralesDataSource = new MatTableDataSource<Platillo>([]); 
  private platillosGeneralesArray: Platillo[] = [];



  @ViewChild('paginatorMisPlatillos') paginatorMisPlatillos!: MatPaginator;
  @ViewChild('paginatorGeneral') paginatorGeneral!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
 

  constructor(private modalService: NgbModal) { }

  ngOnInit(): void {
    this.obtenerPerfilUsuario();
    this.userRole = this.auth.getUserRole() || 'USUARIO';
    this.setupResponsive();
    this.obtenerPlatillos();
    this.setupDataSourceConfig();
  }

  obtenerPerfilUsuario(): void {
    this.http.getUsuarios().subscribe({
      next: (resp: any) => {
        if (resp?.status === 'success' && resp?.data) {
          this.currentUserId = resp.data.id;
        }
      },
      error: (err: any) => {
        this.currentUserId = this.auth.getUser() || '';
      }
    });
  }

  setupResponsive(): void {
    this.breakpointObserver.observe([
      Breakpoints.XSmall,
      Breakpoints.Small,
      Breakpoints.Medium
    ]).pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        const wasMobile = this.isMobile;
        this.isMobile = result.breakpoints[Breakpoints.XSmall] || result.breakpoints[Breakpoints.Small];
        this.isTablet = result.breakpoints[Breakpoints.Medium];

        if (wasMobile !== this.isMobile) {
          if (this.isMobile) {
            this.dataSource.paginator = null;
            this.updateMobilePagination();
          } else {
            this.intentarConfigurarPaginator();
          }
        } else if (this.isMobile) {
          this.updateMobilePagination();
        }

        this.cdr.markForCheck();
      });
  }

private setupDataSourceConfig(): void {
    // Configurar para dataSourceFiltrados (Mis Platillos)
    this.dataSourceFiltrados.filterPredicate = this.createFilterPredicate();
    this.dataSourceFiltrados.sortingDataAccessor = this.createSortingAccessor();

    // Configurar para platillosGeneralesDataSource
    this.platillosGeneralesDataSource.filterPredicate = this.createFilterPredicate();
    this.platillosGeneralesDataSource.sortingDataAccessor = this.createSortingAccessor();
  }


private createFilterPredicate(): (data: Platillo, filter: string) => boolean {
    return (data: Platillo, filter: string) => {
      const searchStr = filter.toLowerCase();
      return data.nombre.toLowerCase().includes(searchStr) ||
        data.descripcion.toLowerCase().includes(searchStr) ||
        data.calorias.toString().includes(searchStr) ||
        data.tiempo_preparacion.toString().includes(searchStr) ||
        (data.creador_nombre || '').toLowerCase().includes(searchStr);
    };
  }

private createSortingAccessor(): (item: Platillo, prop: string) => string | number {
    return (item: Platillo, prop: string) => {
      switch (prop) {
        case 'nombre': return item.nombre.toLowerCase();
        case 'creador': return (item.creador_nombre || '').toLowerCase();
        case 'calorias': return item.calorias;
        case 'tiempo_preparacion': return item.tiempo_preparacion;
        default: return (item[prop as keyof Platillo] as string | number) || '';
      }
    };
  }

  private actualizarPlatillosGenerales(): void {
  const platillosGenerales = this.dataSource.data.filter(platillo => 
    platillo.creador_id !== this.currentUserId
  );
  this.platillosGeneralesDataSource.data = platillosGenerales;
  
  // Configurar filterPredicate para platillos generales
  this.platillosGeneralesDataSource.filterPredicate = (data: Platillo, filter: string) => {
    const searchStr = filter.toLowerCase();
    return data.nombre.toLowerCase().includes(searchStr) ||
      data.descripcion.toLowerCase().includes(searchStr) ||
      data.calorias.toString().includes(searchStr) ||
      data.tiempo_preparacion.toString().includes(searchStr) ||
      (data.creador_nombre || '').toLowerCase().includes(searchStr);
  };
  
  this.platillosGeneralesDataSource.sortingDataAccessor = (item: Platillo, prop: string) => {
    switch (prop) {
      case 'nombre': return item.nombre.toLowerCase();
      case 'creador': return (item.creador_nombre || '').toLowerCase();
      case 'calorias': return item.calorias;
      case 'tiempo_preparacion': return item.tiempo_preparacion;
      default: return item[prop as keyof Platillo] as string;
    }
  };
}

  ngAfterViewInit(): void {
    // Esperar un ciclo para que los ViewChild estén disponibles
    setTimeout(() => {
      this.configurarPaginators();
    }, 0);
  }

private configurarPaginators(): void {
    if (!this.isMobile) {
      // Configurar paginator para "Mis Platillos"
      if (this.paginatorMisPlatillos) {
        this.dataSourceFiltrados.paginator = this.paginatorMisPlatillos;
        console.log('Paginator Mis Platillos configurado');
      }

      // Configurar paginator para "Platillos Generales"
      if (this.paginatorGeneral) {
        this.platillosGeneralesDataSource.paginator = this.paginatorGeneral;
        console.log('Paginator General configurado');
      }

      // Configurar sort si está disponible
      if (this.sort) {
        this.dataSourceFiltrados.sort = this.sort;
        // Necesitarías otro sort para platillosGenerales si quieres ordenar ambas tablas
      }

      this.cdr.detectChanges();
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
            
            // Filtrar mis platillos
            const misPlatillos = resp.data.filter((platillo: Platillo) => 
              platillo.creador_id === this.currentUserId
            );
            this.dataSourceFiltrados.data = misPlatillos;
            
            // Actualizar platillos generales
            const platillosGenerales = resp.data.filter((platillo: Platillo) => 
              platillo.creador_id !== this.currentUserId
            );
            this.platillosGeneralesArray = platillosGenerales;
            this.platillosGeneralesDataSource.data = platillosGenerales;
            
            // Forzar detección de cambios
            this.cdr.detectChanges();
            
            // Reconfigurar paginadores después de actualizar datos
            setTimeout(() => {
              this.configurarPaginators();
            }, 100);
            
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


  getPlatillosGeneralesDataSource(): MatTableDataSource<Platillo> {
  const platillosGenerales = this.dataSource.data.filter(platillo => 
    platillo.creador_id !== this.currentUserId
  );
  const dataSource = new MatTableDataSource<Platillo>(platillosGenerales);
  
  setTimeout(() => {
    if (this.paginatorGeneral) {
      dataSource.paginator = this.paginatorGeneral;
    }
    if (this.sort) {
      dataSource.sort = this.sort;
    }
  });
  
  return dataSource;
}


getPlatillosGeneralesArray(): Platillo[] {
    return this.platillosGeneralesArray;
  }


getPagedData(data: Platillo[], section: string): Platillo[] {
  const pageSize = this.mobilePageSize;
  const currentPage = section === 'misPlatillos' ? this.misPlatillosCurrentPage : this.generalesCurrentPage;
  
  const startIndex = currentPage * pageSize;
  const endIndex = startIndex + pageSize;
  
  return data.slice(startIndex, endIndex);
}


// Métodos de estadísticas para platillos generales
getPlatillosActivosGenerales(): number {
  const platillosGenerales = this.getPlatillosGeneralesArray();
  return platillosGenerales.filter(p => p.status === 1 || p.status === '1').length;
}

getPlatillosInactivosGenerales(): number {
  const platillosGenerales = this.getPlatillosGeneralesArray();
  return platillosGenerales.filter(p => p.status === 0 || p.status === '0').length;
}

getPlatillosConUsuariosGenerales(): number {
  const platillosGenerales = this.getPlatillosGeneralesArray();
  return platillosGenerales.filter(p => this.tieneUsuariosAsignados(p)).length;
}

// Método para platillos activos (mis platillos)
getPlatillosActivos(platillos: Platillo[]): number {
  return platillos.filter(p => p.status === 1 || p.status === '1').length;
}

// Método para platillos inactivos (mis platillos)
getPlatillosInactivos(platillos: Platillo[]): number {
  return platillos.filter(p => p.status === 0 || p.status === '0').length;
}

// Método para platillos con usuarios (mis platillos)
getPlatillosConUsuarios(platillos: Platillo[]): number {
  return platillos.filter(p => this.tieneUsuariosAsignados(p)).length;
}

// Variables para paginación separada en móvil
misPlatillosCurrentPage = 0;
generalesCurrentPage = 0;

// Métodos para cambiar página en móvil
previousPage(section: string): void {
  if (section === 'misPlatillos' && this.misPlatillosCurrentPage > 0) {
    this.misPlatillosCurrentPage--;
  } else if (section === 'generales' && this.generalesCurrentPage > 0) {
    this.generalesCurrentPage--;
  }
}

nextPage(section: string): void {
  const totalPages = this.getTotalPages(section);
  if (section === 'misPlatillos' && this.misPlatillosCurrentPage < totalPages - 1) {
    this.misPlatillosCurrentPage++;
  } else if (section === 'generales' && this.generalesCurrentPage < totalPages - 1) {
    this.generalesCurrentPage++;
  }
}

getTotalPages(section: string): number {
  const data = section === 'misPlatillos' 
    ? this.dataSourceFiltrados.data 
    : this.getPlatillosGeneralesArray();
  return Math.ceil(data.length / this.mobilePageSize);
}

getCurrentPage(section: string): number {
  return section === 'misPlatillos' ? this.misPlatillosCurrentPage : this.generalesCurrentPage;
}


  private intentarConfigurarPaginator(intentos: number = 0): void {
  const maxIntentos = 5;

  if (this.isMobile) {
    this.updateMobilePagination();
    return;
  }

  if (this.paginatorMisPlatillos && this.paginatorGeneral && this.sort) {
    this.configurarPaginators();
  } else if (intentos < maxIntentos) {
    setTimeout(() => {
      this.intentarConfigurarPaginator(intentos + 1);
    }, 200 * (intentos + 1));
  }
}

  applyFilter(value: string): void {
    this.search = value ?? '';
    const filterValue = this.search.trim().toLowerCase();
    
    this.dataSource.filter = filterValue;
    this.dataSourceFiltrados.filter = filterValue;
    this.platillosGeneralesDataSource.filter = filterValue;

    if (!this.isMobile) {
      // Ir a primera página en ambos paginadores
      if (this.dataSourceFiltrados.paginator) {
        this.dataSourceFiltrados.paginator.firstPage();
      }
      if (this.platillosGeneralesDataSource.paginator) {
        this.platillosGeneralesDataSource.paginator.firstPage();
      }
    }
    this.cdr.detectChanges();
  }

  clearSearch(): void {
    this.search = '';
    this.dataSource.filter = '';
    this.dataSourceFiltrados.filter = '';
    this.platillosGeneralesDataSource.filter = '';

    if (!this.isMobile) {
      if (this.dataSourceFiltrados.paginator) {
        this.dataSourceFiltrados.paginator.firstPage();
      }
      if (this.platillosGeneralesDataSource.paginator) {
        this.platillosGeneralesDataSource.paginator.firstPage();
      }
    }
    this.cdr.detectChanges();
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

  getVisibleMobilePages(): number[] {
    const maxVisible = 5; // Máximo 5 páginas visibles
    const totalPages = this.mobileTotalPages;
    const currentPage = this.mobileCurrentPage;
    
    if (totalPages <= maxVisible) {
      // Si hay 5 o menos páginas, mostrar todas
      return Array.from({ length: totalPages }, (_, i) => i);
    }
    
    let start = Math.max(0, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages - 1, start + maxVisible - 1);
    
    // Ajustar si estamos cerca del final
    if (end - start + 1 < maxVisible) {
      start = Math.max(0, end - maxVisible + 1);
    }
    
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
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
    // Verificar si tiene usuarios asignados
    if (this.tieneUsuariosAsignados(platillo)) {
      this.mostrarPlatilloConUsuarios(platillo, 'editar');
      return;
    }

    const modalRef = this.modalService.open(AltaPlatillos, {
      backdrop: 'static',
      size: 'lg',
      scrollable: true
    });

    modalRef.componentInstance.platilloData = platillo;
    modalRef.componentInstance.isEdit = true;

    modalRef.result.then((result) => {
      if (result === 'updated') {
        this.obtenerPlatillos();
      }
    }).catch(() => { });
  }

  eliminarPlatillo(platillo: Platillo): void {
    // Verificar si tiene usuarios asignados
    if (this.tieneUsuariosAsignados(platillo)) {
      this.mostrarPlatilloConUsuarios(platillo, 'eliminar');
      return;
    }

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

  private mostrarPlatilloConUsuarios(platillo: Platillo, accion: string): void {
    const usuariosUnicos = new Map();

    // Filtrar usuarios únicos
    platillo.usuarios_asignados?.forEach((usuario) => {
      if (!usuariosUnicos.has(usuario.usuario_id)) {
        usuariosUnicos.set(usuario.usuario_id, usuario);
      }
    });

    const usuariosList = Array.from(usuariosUnicos.values());

    let usuariosHtml = '<div class="text-left">';
    usuariosHtml += `<p class="mb-3"><strong>No se puede ${accion} porque está asignado a:</strong></p>`;
    usuariosHtml += '<ul class="list-disc pl-5 space-y-1">';

    usuariosList.forEach((usuario: any) => {
      usuariosHtml += `<li><strong>${usuario.usuario_nombre}</strong></li>`;
    });

    usuariosHtml += '</ul>';
    usuariosHtml += `<p class="mt-3 text-sm text-gray-600"><strong>Total de asignaciones:</strong> ${platillo.usuarios_asignados?.length || 0}</p>`;
    usuariosHtml += '<p class="mt-2 text-sm text-blue-600"><strong>Puedes ver los detalles del platillo únicamente.</strong></p>';
    usuariosHtml += '</div>';

    Swal.fire({
      title: `No se puede ${accion}`,
      html: usuariosHtml,
      icon: 'info',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#3085d6',
      width: '600px'
    });
  }

  mostrarUsuariosAsignados(platillo: Platillo): void {
    const usuariosUnicos = new Map();

    // Filtrar usuarios únicos
    platillo.usuarios_asignados?.forEach((usuario) => {
      if (!usuariosUnicos.has(usuario.usuario_id)) {
        usuariosUnicos.set(usuario.usuario_id, usuario);
      }
    });

    const usuariosList = Array.from(usuariosUnicos.values());
    const totalUsuarios = usuariosList.length;
    const USUARIOS_POR_PAGINA = 8; // Máximo 8 usuarios por página
    const totalPaginas = Math.ceil(totalUsuarios / USUARIOS_POR_PAGINA);

    // Función para truncar texto
    const truncateText = (text: string, maxLength: number = 20): string => {
      if (!text) return 'Usuario';
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    // Colores basados en tu paleta
    const colors = ['var(--primary-color)', 'var(--primary-dark)', 'var(--primary-light)', 'var(--accent-color)', '#34495E', '#5D6D7E', '#85929E', '#AEB6BF'];

    let usuariosHtml = `
      <style>
        .usuarios-container {
          max-height: 450px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: var(--text-secondary) var(--background);
          position: relative;
        }
        .usuarios-container::-webkit-scrollbar {
          width: 6px;
        }
        .usuarios-container::-webkit-scrollbar-track {
          background: var(--background);
          border-radius: 3px;
        }
        .usuarios-container::-webkit-scrollbar-thumb {
          background: var(--text-secondary);
          border-radius: 3px;
        }
        .usuario-card {
          background: var(--sidebar-bg);
          border: 2px solid var(--background);
          border-radius: 12px;
          padding: 12px 16px;
          margin-bottom: 8px;
          box-shadow: var(--shadow);
          transition: var(--transition);
        }
        .usuario-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(44, 62, 80, 0.2);
          border-color: var(--primary-color);
        }
        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 16px;
          color: white;
          margin-right: 12px;
          flex-shrink: 0;
          box-shadow: var(--shadow);
          border: 2px solid rgba(255,255,255,0.2);
        }
        .usuario-info h4 {
          margin: 0 0 2px 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.3;
          word-break: break-word;
        }
        .usuario-info p {
          margin: 0;
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.2;
        }
        .stats-container {
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
          color: white;
          border-radius: 12px;
          padding: 16px;
          margin-top: 16px;
          text-align: center;
          box-shadow: var(--shadow);
        }
        .stat-item {
          display: inline-block;
          margin: 0 15px;
        }
        .stat-number {
          font-size: 20px;
          font-weight: 700;
          display: block;
          line-height: 1;
        }
        .stat-label {
          font-size: 11px;
          opacity: 0.9;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 4px;
        }
        .platillo-header {
          background: linear-gradient(135deg, var(--sidebar-bg) 0%, var(--background) 100%);
          border-radius: 12px;
          padding: 14px;
          margin-bottom: 16px;
          border-left: 4px solid var(--accent-color);
          box-shadow: var(--shadow);
        }
        .platillo-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 6px 0;
          line-height: 1.3;
          word-break: break-word;
        }
        .platillo-desc {
          font-size: 13px;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.3;
        }
        .status-badge {
          background: linear-gradient(135deg, var(--accent-color), #E67E22);
          color: white;
          padding: 4px 8px;
          border-radius: 16px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          box-shadow: 0 2px 6px rgba(243, 156, 18, 0.3);
          white-space: nowrap;
        }
        .empty-state {
          text-align: center;
          padding: 30px;
          color: var(--text-secondary);
          background: var(--background);
          border-radius: 12px;
          border: 2px dashed var(--text-secondary);
        }
        .empty-icon {
          font-size: 40px;
          margin-bottom: 12px;
          opacity: 0.6;
        }
        .accent-text {
          color: var(--accent-color);
          font-weight: 600;
        }
        .pagination-info {
          background: var(--background);
          padding: 8px 12px;
          border-radius: 8px;
          margin-bottom: 12px;
          text-align: center;
          font-size: 12px;
          color: var(--text-secondary);
          border: 1px solid var(--text-secondary);
        }
        .usuarios-count {
          background: var(--accent-color);
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          margin-left: 8px;
        }
        .tooltip-name {
          cursor: help;
          border-bottom: 1px dotted var(--text-secondary);
        }
        .warning-many-users {
          background: linear-gradient(135deg, #FFF3CD, #FCF4DD);
          border: 1px solid #F39C12;
          border-radius: 8px;
          padding: 10px;
          margin-bottom: 12px;
          font-size: 12px;
          color: var(--text-primary);
        }
      </style>
      
      <div>
        <!-- Header del platillo -->
        <div class="platillo-header">
          <h3 class="platillo-title">
            <i class="bi bi-egg-fried" style="margin-right: 8px; color: var(--accent-color);"></i> ${truncateText(platillo.nombre, 35)}
            ${totalUsuarios > 0 ? `<span class="usuarios-count">${totalUsuarios}</span>` : ''}
          </h3>
          <p class="platillo-desc">
            ${totalUsuarios === 0 ? 'Este platillo no tiene usuarios asignados' :
        totalUsuarios === 1 ? 'Este platillo está asignado a 1 usuario' :
          `Este platillo está asignado a ${totalUsuarios} usuarios`}
          </p>
        </div>
        
        <!-- Advertencia para muchos usuarios -->
        ${totalUsuarios > USUARIOS_POR_PAGINA ? `
          <div class="warning-many-users">
            ⚠️ <strong>Lista extensa:</strong> Mostrando los primeros ${USUARIOS_POR_PAGINA} usuarios de ${totalUsuarios} total. 
            Usa el scroll para ver todos.
          </div>
        ` : ''}
        
        <!-- Info de paginación -->
        ${totalUsuarios > 5 ? `
          <div class="pagination-info">
            📊 Mostrando <strong>${Math.min(USUARIOS_POR_PAGINA, totalUsuarios)}</strong> de <strong>${totalUsuarios}</strong> usuarios únicos
          </div>
        ` : ''}
        
        <!-- Lista de usuarios -->
        <div class="usuarios-container">
    `;

    if (usuariosList.length === 0) {
      usuariosHtml += `
        <div class="empty-state">
          <div class="empty-icon"><i class="bi bi-person-x" style="font-size: 48px; color: var(--text-secondary); opacity: 0.6;"></i></div>
          <h4 style="color: var(--text-primary); margin-bottom: 8px; font-size: 14px;">No hay usuarios asignados</h4>
          <p style="font-size: 12px;">Este platillo aún no ha sido asignado a ningún usuario.</p>
        </div>
      `;
    } else {
      // Mostrar solo los primeros usuarios (paginación básica)
      const usuariosAMostrar = usuariosList.slice(0, USUARIOS_POR_PAGINA);
      const usuariosRestantes = totalUsuarios - USUARIOS_POR_PAGINA;

      usuariosAMostrar.forEach((usuario: any, index: number) => {
        const avatarColor = colors[index % colors.length];
        const inicial = usuario.usuario_nombre?.charAt(0)?.toUpperCase() || 'U';
        const nombreCompleto = usuario.usuario_nombre || 'Usuario sin nombre';
        const nombreTruncado = truncateText(nombreCompleto, 25);
        const needsTooltip = nombreCompleto.length > 25;

        usuariosHtml += `
          <div class="usuario-card">
            <div style="display: flex; align-items: center;">
              <div class="avatar" style="background: ${avatarColor};">
                ${inicial}
              </div>
              <div class="usuario-info" style="flex: 1; min-width: 0;">
                <h4 ${needsTooltip ? `class="tooltip-name" title="${nombreCompleto}"` : ''}>
                  ${nombreTruncado}
                </h4>
                <p><i class="bi bi-person-badge" style="margin-right: 4px; color: var(--accent-color);"></i>ID: <span class="accent-text">${usuario.usuario_id}</span> • <i class="bi bi-envelope" style="margin-right: 4px; color: var(--accent-color);"></i>Usuario del sistema</p>
              </div>
              <div style="text-align: right; flex-shrink: 0;">
                <div class="status-badge"><i class="bi bi-check-circle" style="margin-right: 4px;"></i>Activo</div>
              </div>
            </div>
          </div>
        `;
      });

      // Mostrar indicador de usuarios adicionales si hay más
      if (usuariosRestantes > 0) {
        usuariosHtml += `
          <div style="text-align: center; padding: 16px; background: var(--background); border-radius: 8px; margin-top: 8px;">
            <div style="color: var(--text-secondary); font-size: 12px; margin-bottom: 4px;">
              <i class="bi bi-plus-circle" style="margin-right: 4px; color: var(--accent-color);"></i><strong>${usuariosRestantes}</strong> usuario${usuariosRestantes > 1 ? 's' : ''} adicional${usuariosRestantes > 1 ? 'es' : ''}
            </div>
            <div style="color: var(--accent-color); font-size: 11px; font-weight: 600;">
              Scroll hacia arriba para ver la lista completa
            </div>
          </div>
        `;
      }
    }

    usuariosHtml += `
        </div>
        
        <!-- Estadísticas -->
        <div class="stats-container">
          <div class="stat-item">
            <span class="stat-number">${totalUsuarios}</span>
            <span class="stat-label">Usuarios Únicos</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">${platillo.usuarios_asignados?.length || 0}</span>
            <span class="stat-label">Total Asignaciones</span>
          </div>
          ${totalUsuarios > USUARIOS_POR_PAGINA ? `
            <div class="stat-item">
              <span class="stat-number">${USUARIOS_POR_PAGINA}</span>
              <span class="stat-label">Mostrados</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    Swal.fire({
      title: `<i class="bi bi-people" style="color: var(--accent-color); margin-right: 8px; font-size: 20px;"></i><span style="color: var(--text-primary);">Usuarios Asignados</span>`,
      html: usuariosHtml,
      showConfirmButton: true,
      confirmButtonText: '<i class="bi bi-check2" style="margin-right: 8px;"></i>Entendido',
      confirmButtonColor: 'var(--primary-color)',
      width: totalUsuarios > 5 ? '650px' : '600px',
      padding: '0',
      background: 'var(--sidebar-bg)',
      customClass: {
        popup: 'swal2-popup',
        title: 'text-lg font-bold py-4 px-6',
        htmlContainer: 'p-6',
        confirmButton: 'px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300'
      },
      showClass: {
        popup: 'animate__animated animate__fadeInUp animate__faster'
      },
      hideClass: {
        popup: 'animate__animated animate__fadeOutDown animate__faster'
      },
      allowOutsideClick: true,
      allowEscapeKey: true,
      focusConfirm: false
    });
  }

  togglePlatilloStatus(platillo: Platillo, nuevoStatus: boolean): void {
    const action = nuevoStatus ? 'activar' : 'desactivar';

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
        this.actualizarStatusPlatillo(platillo, nuevoStatus);
      }
    });
  }

  private actualizarStatusPlatillo(platillo: Platillo, nuevoStatus: boolean): void {
    const statusData = {
      status: nuevoStatus ? 1 : 0
    };

    this.http.platilloStatus(Number(platillo.id), statusData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp: any) => {
          if (resp?.status === 'success') {
            // Si es desactivación y hay usuarios afectados, mostrar información
            if (!nuevoStatus && resp.data && resp.data.usuarios_afectados) {
              this.mostrarUsuariosAfectados(resp.data);
              return; // No actualizar el estado ya que no se pudo desactivar
            }

            // Actualizar el estado local
            platillo.status = nuevoStatus ? 1 : 0;
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
              title: resp.message || `Platillo ${nuevoStatus ? 'activado' : 'desactivado'} correctamente`
            });
          }
        },
        error: (error) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error?.error?.message || 'Error al actualizar el estado del platillo'
          });
        }
      });
  }

  private mostrarUsuariosAfectados(data: any): void {
    const usuariosUnicos = new Map();

    // Filtrar usuarios únicos
    data.usuarios_afectados?.forEach((usuario: any) => {
      if (!usuariosUnicos.has(usuario.usuario_id)) {
        usuariosUnicos.set(usuario.usuario_id, usuario);
      }
    });

    const usuariosList = Array.from(usuariosUnicos.values());

    let usuariosHtml = '<div class="text-left">';
    usuariosHtml += '<p class="mb-3"><strong>Usuarios que tienen asignado este platillo:</strong></p>';
    usuariosHtml += '<ul class="list-disc pl-5 space-y-1">';

    usuariosList.forEach((usuario: any) => {
      usuariosHtml += `<li><strong>${usuario.usuario_nombre}</strong><br><small class="text-gray-600">${usuario.usuario_correo}</small></li>`;
    });

    usuariosHtml += '</ul>';
    usuariosHtml += `<p class="mt-3 text-sm text-gray-600"><strong>Total de asignaciones:</strong> ${data.total_usuarios}</p>`;
    usuariosHtml += '</div>';

    Swal.fire({
      title: 'No se puede desactivar',
      html: usuariosHtml,
      icon: 'warning',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#3085d6',
      width: '600px'
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
    if (calorias <= 200) return 'role-badge nutricionista';
    if (calorias <= 400) return 'role-badge recepcionista';
    if (calorias <= 600) return 'role-badge usuario';
    return 'role-badge admin';
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

  truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  get currentDisplayedColumns(): string[] {
    if (this.isMobile) return [];
    if (this.isTablet) return this.displayedColumnsTablet;
    return this.displayedColumns;
  }

  get totalPlatillos(): number {
    return this.dataSource.data.length;
  }

  get platillosActivos(): number {
    return this.dataSource.data.filter(p => p.status === 1 || p.status === '1').length;
  }

  get platillosInactivos(): number {
    return this.dataSource.data.filter(p => p.status === 0 || p.status === '0').length;
  }

  get platillosConUsuarios(): number {
    return this.dataSource.data.filter(p => this.tieneUsuariosAsignados(p)).length;
  }

  get platillosSinUsuarios(): number {
    return this.dataSource.data.filter(p => !this.tieneUsuariosAsignados(p)).length;
  }

  get platillosPublicos(): number {
    return this.dataSource.data.filter(p => p.es_publico === 1 || p.es_publico === '1').length;
  }

  get platillosPrivados(): number {
    return this.dataSource.data.filter(p => p.es_publico === 0 || p.es_publico === '0').length;
  }

  get promedioCalorias(): number {
    if (this.dataSource.data.length === 0) return 0;
    const total = this.dataSource.data.reduce((sum, p) => {
      const calorias = Number(p.calorias) || 0;
      return sum + calorias;
    }, 0);
    const promedio = total / this.dataSource.data.length;
    return Math.round(promedio);
  }

  isPlatilloActivo(platillo: Platillo): boolean {
    return platillo.status === 1 || platillo.status === '1';
  }

  isPlatilloPublico(platillo: Platillo): boolean {
    return platillo.es_publico === 1 || platillo.es_publico === '1';
  }

  tieneUsuariosAsignados(platillo: Platillo): boolean {
    return !!(platillo.usuarios_asignados && platillo.usuarios_asignados.length > 0);
  }

  canEditOrDelete(platillo: Platillo): boolean {
    const currentUserRole = this.userRole.toUpperCase();
    const platilloCreadorId = platillo.creador_id.toString();
    const currentUserId = this.currentUserId.toString();

    // Si el platillo tiene usuarios asignados, solo permitir ver
    if (this.tieneUsuariosAsignados(platillo)) {
      return false;
    }

    if (currentUserRole === 'ADMIN') {
      return true;
    }

    const isOwner = platilloCreadorId === currentUserId;

    if (currentUserRole === 'NUTRICIONISTA' && isOwner) {
      return true;
    }

    if (isOwner) {
      return true;
    }

    return false;
  }

  handleImageError(event: any): void {
    if (event.target) {
      event.target.style.display = 'none';
      const placeholder = event.target.nextElementSibling;
      if (placeholder) {
        placeholder.style.display = 'flex';
      }
      event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyMkMyMS4xMDQ2IDIyIDIyIDIxLjEwNDYgMjIgMjBDMjIgMTguODk1NCAyMS4xMDQ2IDE4IDIwIDE4QzE4Ljg5NTQgMTggMTggMTguODk1NCAxOCAyMEMxOCAyMS4xMDQ2IDE4Ljg5NTQgMjIgMjAgMjJaIiBmaWxsPSIjOUI5QjlCIi8+CjxwYXRoIGQ9Ik0yNiAyOEgyNFYyNkgyNlYyOFoiIGZpbGw9IiM5QjlCOUIiLz4KPC9zdmc+';
    }
  }

  verDetallesPlatillo(platillo: Platillo): void {
    const modalRef = this.modalService.open(AltaPlatillos, {
      backdrop: 'static',
      size: 'lg',
      scrollable: true
    });

    modalRef.componentInstance.platilloData = platillo;
    modalRef.componentInstance.isEdit = true; // Usar modo edición para cargar datos
    modalRef.componentInstance.isViewOnly = true; // Modo solo lectura

    modalRef.result.then(() => {
      // No hacer nada cuando se cierre
    }).catch(() => { });
  }

  openModalAltaPlatillos(item?: any, edit?: boolean): void {
    const modalRef = this.modalService.open(AltaPlatillos, {
      backdrop: 'static',
      size: 'lg',
      scrollable: true
    });

    modalRef.componentInstance.dataSource = this.dataSource.data;

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
