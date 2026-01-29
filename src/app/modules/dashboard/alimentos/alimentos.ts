import { AfterViewInit, Component, ViewChild, inject, OnInit, OnDestroy, ChangeDetectionStrategy, TrackByFunction, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil, finalize } from 'rxjs';
import { NgbModal, NgbModalModule, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { BreakpointObserver, Breakpoints, LayoutModule } from '@angular/cdk/layout';
import Swal from 'sweetalert2';

// Services
import { HttpServices } from '../../../core/services/http/http.service';
import { AuthServices } from '../../../core/services/auth/auth.service';
import { AltaAlimento } from '../../shared/modales/alta-alimento/alta-alimento';

// Interfaces
interface Alimento {
  id: string;
  nombre: string;
  categoria_id: string;
  cantidad_sugerida: number;
  unidad: string; 
  energia_kcal: number;
  proteina_g: number;
  hidratos_de_carbono_g: number;
  lipidos_g: number;
  status?: string | number;
  id_usuario?: string | number;
  creador_nombre?: string;
  [key: string]: any;
}

interface Stats {
  avgCalories: number;
  avgProtein: string;
  uniqueCategories: number;
}

@Component({
  selector: 'app-alimentos',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatTableModule, MatPaginatorModule,
    MatSortModule, MatFormFieldModule, MatInputModule, MatIconModule, NgIf, NgbModalModule, LayoutModule,
  ],
  templateUrl: './alimentos.html', 
  styleUrl: './alimentos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class alimentos implements OnInit, AfterViewInit, OnDestroy {

  // Dependencies
/*   private modalService = inject(NgbModal);
 */  /* private breakpointObserver = inject(BreakpointObserver);
  private cdr = inject(ChangeDetectorRef);
  private http = inject(HttpServices);
  private auth = inject(AuthServices);  */

  constructor(
    private modalService: NgbModal,
    private breakpointObserver: BreakpointObserver,
    private cdr: ChangeDetectorRef,
    private http: HttpServices,
    private auth: AuthServices
  ) {}

   
  // Lifecycle
  private destroy$ = new Subject<void>();
  private viewInitialized = false;
  
  // State
  isNutricionista = false;
  loading = false;
  errorMsg: string | null = null;
  search = '';
  
  // User Context
  currentUserId: number = 0;
  userRole = '';
  
  // Data
  categorias: any[] = [];
  categoryMap = new Map<string, string>();
  private allAlimentos: Alimento[] = [];

  // Material Tables
  misAlimentosDataSource = new MatTableDataSource<Alimento>([]);
  alimentosGeneralesDataSource = new MatTableDataSource<Alimento>([]);

  displayedColumns: string[] = [
    'nombre', 'categoria_id', 'cantidad_sugerida', 
    'energia_kcal', 'proteina_g', 'hidratos_de_carbono_g', 'lipidos_g'
  ];
  displayedColumnsTablet: string[] = ['nombre', 'categoria_id', 'energia_kcal', 'proteina_g'];

  // Responsive
  isMobile = false;
  isTablet = false;
  mobilePageSize = 6;
  
  // Mobile Pagination
  misAlimentosCurrentPage = 0;
  misAlimentosTotalPages = 0;
  generalesCurrentPage = 0;
  generalesTotalPages = 0;

  // Statistics
  private _misAlimentosStats: Stats = { avgCalories: 0, avgProtein: '0', uniqueCategories: 0 };
  private _generalesStats: Stats = { avgCalories: 0, avgProtein: '0', uniqueCategories: 0 };
  private _statsDirty = true;

  // ViewChildren
  @ViewChild('paginatorMisAlimentos') paginatorMisAlimentos!: MatPaginator;
  @ViewChild('paginatorGeneral') paginatorGeneral!: MatPaginator;
  @ViewChild('sortMisAlimentos') sortMisAlimentos!: MatSort;
  @ViewChild('sortGeneral') sortGeneral!: MatSort;

  // ========================================================================
  // LIFECYCLE HOOKS
  // ========================================================================

  ngOnInit(): void {
    console.log('[Alimentos] Inicializando componente');
    
    // Initialize user context
    this.initializeUserContext();
    
    // Setup responsive behavior
    this.setupResponsive();
    
    // Configure data source predicates
    this.setupDataSourcePredicates();
    
    // Load categories (async, non-blocking)
    this.obtenerCategorias();
  }

  ngAfterViewInit(): void {
    console.log('[Alimentos] Vista inicializada');
    this.viewInitialized = true;
    
    // Configure paginators if not mobile
    if (!this.isMobile) {
      this.configurePaginatorsAndSort();
    }
    
    // NOW load the data
    this.obtenerAlimentos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  private initializeUserContext(): void {
    // Get user role
    const rol = this.auth.getRole();
    this.userRole = rol || '';
    this.isNutricionista = rol == 'NUTRICIONISTA';
    
    // Get user ID (try from auth service first)
    const localId = this.auth.getIdUser();
    if (localId) {
      this.currentUserId = Number(localId);
    }
    
    // Async fetch for complete profile (may update currentUserId)
    this.obtenerPerfilUsuario();
    
    console.log('[Alimentos] Usuario:', { 
      id: this.currentUserId, 
      rol: this.userRole, 
      isNutricionista: this.isNutricionista 
    });
  }

  private setupDataSourcePredicates(): void {
    // Shared filter predicate
    const filterPredicate = (data: Alimento, filter: string): boolean => {
      const searchStr = filter.toLowerCase();
      const catName = this.categoryNameById(data?.categoria_id).toLowerCase();
      return data.nombre.toLowerCase().includes(searchStr) ||
             (data.unidad || '').toLowerCase().includes(searchStr) ||
             catName.includes(searchStr) ||
             data.energia_kcal.toString().includes(searchStr);
    };

    // Shared sorting accessor
    const sortingAccessor = (item: Alimento, prop: string): string | number => {
      if (prop === 'categoria_id') {
        return this.categoryNameById(item?.categoria_id).toLowerCase();
      }
      
      const numericFields = [
        'energia_kcal', 'proteina_g', 'lipidos_g', 
        'hidratos_de_carbono_g', 'cantidad_sugerida'
      ];
      
      if (numericFields.includes(prop)) {
        const value = item[prop];
        return parseFloat((value ?? '0').toString().replace(',', '.')) || 0;
      }
      
      return (item[prop] as string | number) || '';
    };

    // Apply to both data sources
    this.misAlimentosDataSource.filterPredicate = filterPredicate;
    this.misAlimentosDataSource.sortingDataAccessor = sortingAccessor;
    
    this.alimentosGeneralesDataSource.filterPredicate = filterPredicate;
    this.alimentosGeneralesDataSource.sortingDataAccessor = sortingAccessor;
  }


  private reconectarPaginadoresDespuesDeCarga(): void {
  if (this.isMobile) return;
  
  // Forzar la desconexión y reconexión de los paginadores
  setTimeout(() => {
    // Para "Mis Alimentos"
    if (this.paginatorMisAlimentos) {
      this.misAlimentosDataSource.paginator = null;
      this.cdr.detectChanges();
      this.misAlimentosDataSource.paginator = this.paginatorMisAlimentos;
    }
    
    // Para "Alimentos Generales"
    if (this.paginatorGeneral) {
      this.alimentosGeneralesDataSource.paginator = null;
      this.cdr.detectChanges();
      this.alimentosGeneralesDataSource.paginator = this.paginatorGeneral;
    }
    
    console.log('[Alimentos] Paginadores reconectados después de carga');
  }, 100);
}

  private configurePaginatorsAndSort(): void {
    console.log('[Alimentos] Configurando paginadores y sort');
    
    // Configure "Mis Alimentos" table
    if (this.paginatorMisAlimentos) {
      this.misAlimentosDataSource.paginator = this.paginatorMisAlimentos;
    }
    if (this.sortMisAlimentos) {
      this.misAlimentosDataSource.sort = this.sortMisAlimentos;
    }
    
    // Configure "Generales" table
    if (this.paginatorGeneral) {
      this.alimentosGeneralesDataSource.paginator = this.paginatorGeneral;
    }
    if (this.sortGeneral) {
      this.alimentosGeneralesDataSource.sort = this.sortGeneral;
    }
  }

  // ========================================================================
  // RESPONSIVE BEHAVIOR
  // ========================================================================

  setupResponsive(): void {
    this.breakpointObserver
      .observe([Breakpoints.XSmall, Breakpoints.Small, Breakpoints.Medium])
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        const wasMobile = this.isMobile;
        
        this.isMobile = result.breakpoints[Breakpoints.XSmall] || 
                        result.breakpoints[Breakpoints.Small];
        this.isTablet = result.breakpoints[Breakpoints.Medium];

        // Handle transition between mobile and desktop
        if (wasMobile !== this.isMobile) {
          if (this.isMobile) {
            // Switch to mobile: disconnect Material paginators
            this.misAlimentosDataSource.paginator = null;
            this.alimentosGeneralesDataSource.paginator = null;
            this.updateMobilePagination();
          } else if (this.viewInitialized) {
            // Switch to desktop: reconnect Material paginators
            this.configurePaginatorsAndSort();
          }
        } else if (this.isMobile) {
          // Still mobile: update pagination
          this.updateMobilePagination();
        }
        
        this.cdr.markForCheck();
      });
  }

  // ========================================================================
  // DATA FETCHING
  // ========================================================================

  obtenerPerfilUsuario(): void {
    this.http.getUsuarios()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp: any) => {
          if (resp?.status === 'success' && resp?.data?.id) {
            this.currentUserId = resp.data.id;
            console.log('[Alimentos] ID de usuario actualizado:', this.currentUserId);
          }
        },
        error: (err) => {
          console.warn('[Alimentos] Error obteniendo perfil, usando fallback:', err);
          const fallbackId = this.auth.getUser();
          if (fallbackId) {
            this.currentUserId = Number(fallbackId);
          }
        }
      });
  }

  obtenerCategorias(): void {
    this.http.obtenerCategoria()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp: any) => {
          const payload = resp?.data ?? resp;
          const data = Array.isArray(payload) ? payload : (payload ? [payload] : []);
          this.categorias = data;
          this.categoryMap = new Map(this.categorias.map(c => [String(c.id), c.nombre]));
          console.log('[Alimentos] Categorías cargadas:', this.categorias.length);
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('[Alimentos] Error cargando categorías:', err);
          this.errorMsg = 'Error al cargar categorías';
          this.cdr.markForCheck();
        }
      });
  }

  obtenerAlimentos(): void {
    console.log('[Alimentos] Iniciando carga de alimentos');
    this.loading = true;
    this.errorMsg = null;
    this.cdr.markForCheck();

    this.http.obtenerAlimentos()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          console.log('[Alimentos] Carga finalizada');
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (resp: any) => {
          if (resp?.status === 'success' && Array.isArray(resp.data)) {
            console.log('[Alimentos] Datos recibidos:', resp.data.length);
            this.allAlimentos = resp.data;
            
            // Distribute data based on role
            this.distributeDataByRole(resp.data);
            
            // Recalculate statistics
            this._statsDirty = true;

            this.reconectarPaginadoresDespuesDeCarga();
            
            // Update mobile pagination if needed
            if (this.isMobile) {
              this.updateMobilePagination();
            }
            
            console.log('[Alimentos] Distribución:', {
              misAlimentos: this.misAlimentosDataSource.data.length,
              generales: this.alimentosGeneralesDataSource.data.length
            });
          } else {
            this.errorMsg = 'Formato de respuesta inválido';
            console.error('[Alimentos] Respuesta inválida:', resp);
          }
        },
        error: (err) => {
          this.errorMsg = err?.error?.message || 'Error al cargar alimentos';
          console.error('[Alimentos] Error:', err);
        }
      });
  }

  private distributeDataByRole(data: Alimento[]): void {
    if (this.isNutricionista) {
      // Mis Alimentos: created by current user
      const misAlimentos = data.filter(a => 
        Number(a.id_usuario) === this.currentUserId
      );
      this.misAlimentosDataSource.data = misAlimentos;
      
      // Generales: active foods NOT created by current user
      const generales = data.filter(a => 
        Number(a.id_usuario) !== this.currentUserId &&
        (a.status === 1 || a.status === '1')
      );
      this.alimentosGeneralesDataSource.data = generales;
    } else {
      // For non-nutritionists: only show active foods
      this.misAlimentosDataSource.data = [];
      const activos = data.filter(a => a.status === 1 || a.status === '1');
      this.alimentosGeneralesDataSource.data = activos;
    }
  }

  // ========================================================================
  // FILTERING & SEARCH
  // ========================================================================

  applyFilter(value: string): void {
    this.search = value ?? '';
    const filterValue = this.search.trim().toLowerCase();
    
    this.misAlimentosDataSource.filter = filterValue;
    this.alimentosGeneralesDataSource.filter = filterValue;

    if (this.isMobile) {
      // Reset mobile pagination to first page
      this.misAlimentosCurrentPage = 0;
      this.generalesCurrentPage = 0;
      this.updateMobilePagination();
    } else {
      // Reset Material paginators to first page
      if (this.misAlimentosDataSource.paginator) {
        this.misAlimentosDataSource.paginator.firstPage();
      }
      if (this.alimentosGeneralesDataSource.paginator) {
        this.alimentosGeneralesDataSource.paginator.firstPage();
      }
    }
    
    this.cdr.markForCheck();
  }

  clearSearch(): void {
    this.search = '';
    this.applyFilter('');
  }

  // ========================================================================
  // MOBILE PAGINATION
  // ========================================================================

  updateMobilePagination(): void {
    if (!this.isMobile) return;
    
    this.misAlimentosTotalPages = Math.ceil(
      this.misAlimentosDataSource.filteredData.length / this.mobilePageSize
    );
    this.generalesTotalPages = Math.ceil(
      this.alimentosGeneralesDataSource.filteredData.length / this.mobilePageSize
    );
    
    this.cdr.markForCheck();
  }

  getPagedMisAlimentos(): Alimento[] {
    const start = this.misAlimentosCurrentPage * this.mobilePageSize;
    const end = start + this.mobilePageSize;
    return this.misAlimentosDataSource.filteredData.slice(start, end);
  }

  getPagedGenerales(): Alimento[] {
    const start = this.generalesCurrentPage * this.mobilePageSize;
    const end = start + this.mobilePageSize;
    return this.alimentosGeneralesDataSource.filteredData.slice(start, end);
  }

  previousMisAlimentosPage(): void {
    if (this.misAlimentosCurrentPage > 0) {
      this.misAlimentosCurrentPage--;
      this.cdr.markForCheck();
    }
  }

  nextMisAlimentosPage(): void {
    if (this.misAlimentosCurrentPage < this.misAlimentosTotalPages - 1) {
      this.misAlimentosCurrentPage++;
      this.cdr.markForCheck();
    }
  }

  previousGeneralesPage(): void {
    if (this.generalesCurrentPage > 0) {
      this.generalesCurrentPage--;
      this.cdr.markForCheck();
    }
  }

  nextGeneralesPage(): void {
    if (this.generalesCurrentPage < this.generalesTotalPages - 1) {
      this.generalesCurrentPage++;
      this.cdr.markForCheck();
    }
  }

  // ========================================================================
  // STATISTICS
  // ========================================================================

  get avgCaloriesMisAlimentos(): number {
    this.recomputeStatsIfNeeded();
    return this._misAlimentosStats.avgCalories;
  }

  get avgProteinMisAlimentos(): string {
    this.recomputeStatsIfNeeded();
    return this._misAlimentosStats.avgProtein;
  }

  get uniqueCategoriesMisAlimentos(): number {
    this.recomputeStatsIfNeeded();
    return this._misAlimentosStats.uniqueCategories;
  }

  get avgCaloriesGenerales(): number {
    this.recomputeStatsIfNeeded();
    return this._generalesStats.avgCalories;
  }

  get avgProteinGenerales(): string {
    this.recomputeStatsIfNeeded();
    return this._generalesStats.avgProtein;
  }

  get uniqueCategoriesGenerales(): number {
    this.recomputeStatsIfNeeded();
    return this._generalesStats.uniqueCategories;
  }

  private recomputeStatsIfNeeded(): void {
    if (!this._statsDirty) return;
    
    this._misAlimentosStats = this.calculateStatsForData(
      this.misAlimentosDataSource.data
    );
    this._generalesStats = this.calculateStatsForData(
      this.alimentosGeneralesDataSource.data
    );
    
    this._statsDirty = false;
  }

  private calculateStatsForData(data: Alimento[]): Stats {
    if (!data.length) {
      return { avgCalories: 0, avgProtein: '0', uniqueCategories: 0 };
    }
    
    let totalCal = 0;
    let totalProt = 0;
    const categories = new Set<string>();
    
    data.forEach(item => {
      totalCal += Number(item.energia_kcal) || 0;
      totalProt += Number(item.proteina_g) || 0;
      categories.add(String(item.categoria_id));
    });
    
    return {
      avgCalories: Math.round(totalCal / data.length),
      avgProtein: (totalProt / data.length).toFixed(1),
      uniqueCategories: categories.size
    };
  }

  // ========================================================================
  // ACTIONS
  // ========================================================================

  retryLoad(): void {
    this.obtenerAlimentos();
  }

  openModalAlimentos(item?: Alimento, edit?: boolean): void {
    const modalRef = this.modalService.open(AltaAlimento, {
      backdrop: 'static',
      size: 'lg',
      scrollable: true
    });

    modalRef.componentInstance.misAlimentosDataSource = this.allAlimentos;
    modalRef.componentInstance.alimentoData = edit ? item : null;
    modalRef.componentInstance.isEdit = !!edit;

    modalRef.result.then(
      (result) => {
        if (result?.success) {
          const action = result.isEdit ? 'actualizado' : 'creado';
          Swal.fire({
            icon: 'success',
            title: `Alimento ${action}`,
            text: 'Se guardó correctamente.',
            confirmButtonText: 'Aceptar'
          }).then(() => {
            this.obtenerAlimentos();
          });
        }
      },
      () => {}
    );
  }

  // ========================================================================
  // UTILITIES
  // ========================================================================

  categoryNameById(id: any): string {
    const key = id !== null && id !== undefined ? String(id) : '';
    return this.categoryMap.get(key) ?? (key || '—');
  }

  getCategoryColor(category: string): string {
    const colors = [
      '#E74C3C', '#3498DB', '#2ECC71', '#F39C12',
      '#9B59B6', '#1ABC9C', '#E67E22', '#34495E'
    ];
    const key = (category ?? 'X').toString();
    const index = key.charCodeAt(0) % colors.length;
    return colors[index];
  }

  truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  trackById: TrackByFunction<Alimento> = (index: number, item: Alimento): string => {
    return item.id;
  };

  get currentDisplayedColumns(): string[] {
    return this.isTablet ? this.displayedColumnsTablet : this.displayedColumns;
  }
}