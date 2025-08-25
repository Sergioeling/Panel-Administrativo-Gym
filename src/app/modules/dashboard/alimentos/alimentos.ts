import { AfterViewInit, Component, ViewChild, inject, OnInit, OnDestroy, ChangeDetectionStrategy, TrackByFunction, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil } from 'rxjs';
import { HttpServices } from '../../../core/services/http/http.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AltaAlimento } from '../../shared/modales/alta-alimento/alta-alimento';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

@Component({
  selector: 'app-alimentos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    NgIf
  ],
  templateUrl: './alimentos.html',
  styleUrl: './alimentos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class alimentos implements OnInit, AfterViewInit, OnDestroy {

  constructor(
    private modalService: NgbModal,
    private breakpointObserver: BreakpointObserver,
    private cdr: ChangeDetectorRef
  ) { }

  private http = inject(HttpServices);
  private destroy$ = new Subject<void>();

  loading = false;
  errorMsg: string | null = null;
  search = '';
  isMobile = false;
  isTablet = false;
  mobilePageSize = 6;
  mobileCurrentPage = 0;
  mobileTotalPages = 0;
  mobilePagedData: any[] = [];

  private _stats = {
    avgCalories: 0,
    avgProtein: '0',
    uniqueCategories: 0,
  };
  private _statsDirty = true;

  displayedColumns: string[] = [
    'nombre',
    'categoria_id',
    'cantidad_sugerida',
    'energia_kcal',
    'proteina_g',
    'hidratos_de_carbono_g',
    'lipidos_g'
  ];

  displayedColumnsTablet: string[] = [
    'nombre',
    'categoria_id',
    'energia_kcal',
    'proteina_g'
  ];

  dataSource = new MatTableDataSource<any>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.setupResponsive();
    this.obtenerDietas();
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
    this.dataSource.filterPredicate = (data: any, filter: string) => {
      const f = (filter ?? '').trim().toLowerCase();
      return (
        (data?.nombre ?? '').toString().toLowerCase().includes(f) ||
        (data?.unidad ?? '').toString().toLowerCase().includes(f) ||
        (data?.categoria_id ?? '').toString().toLowerCase().includes(f)
      );
    };

    this.dataSource.sortingDataAccessor = (item: any, prop: string) => {
      const numeric = [
        'energia_kcal', 'proteina_g', 'lipidos_g', 'hidratos_de_carbono_g',
        'peso_bruto_g', 'peso_neto_g', 'fibra_g', 'calcio_mg', 'hierro_mg',
        'potasio_mg', 'sodio_mg', 'fosforo_mg', 'vitamina_a_mg_re'
      ];

      if (numeric.includes(prop)) {
        const value = item?.[prop];
        const v = parseFloat((value ?? '').toString().replace(',', '.')) || 0;
        return isNaN(v) ? 0 : v;
      }
      return item?.[prop];
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

  obtenerDietas(): void {
    this.loading = true;
    this.errorMsg = null;
    this.cdr.markForCheck();

    this.http.obtenerAlimentos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp: any) => {
          const payload = resp?.data ?? resp;
          const data: any[] = Array.isArray(payload) ? payload : (payload ? [payload] : []);
          this.dataSource.data = data;

          if (!this.isMobile && this.paginator) {
            this.dataSource.paginator = this.paginator;
          }
          if (!this.isMobile && this.sort) {
            this.dataSource.sort = this.sort;
          }

          this._statsDirty = true;
          this.updateMobilePagination();
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error al obtener alimentos:', err);
          this.errorMsg = 'No se pudieron cargar los alimentos. Intenta nuevamente.';
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

  // Paginación móvil
  updateMobilePagination(): void {
    if (!this.isMobile) return;

    const filteredData = this.dataSource.filteredData.length
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

    // Mostrar máximo 5 páginas
    let start = Math.max(0, current - 2);
    let end = Math.min(totalPages - 1, current + 2);

    // Ajustar si estamos cerca del inicio o final
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

  // Datos para móvil
  get filteredData(): any[] {
    return this.dataSource.filteredData.length
      ? this.dataSource.filteredData
      : this.dataSource.data;
  }

  trackById: TrackByFunction<any> = (index: number, item: any): string => {
    const id = (item?.id ?? index);
    return id.toString();
  };

  get avgCalories(): number {
    if (this._statsDirty) this._recomputeStats();
    return this._stats.avgCalories;
  }

  get avgProtein(): string {
    if (this._statsDirty) this._recomputeStats();
    return this._stats.avgProtein;
  }

  get uniqueCategories(): number {
    if (this._statsDirty) this._recomputeStats();
    return this._stats.uniqueCategories;
  }

  private _recomputeStats(): void {
    const data = this.dataSource.data ?? [];
    if (!data.length) {
      this._stats = { avgCalories: 0, avgProtein: '0', uniqueCategories: 0 };
      this._statsDirty = false;
      return;
    }

    const toNum = (v: any) => parseFloat((v ?? '0').toString());

    const totalCalories = data.reduce((sum: number, i: any) => sum + (toNum(i.energia_kcal) || 0), 0);
    const totalProtein = data.reduce((sum: number, i: any) => sum + (toNum(i.proteina_g) || 0), 0);
    const categories = new Set((data as any[]).map((i: any) => i?.categoria_id));

    this._stats.avgCalories = Math.round(totalCalories / data.length);
    this._stats.avgProtein = (totalProtein / data.length).toFixed(1);
    this._stats.uniqueCategories = categories.size;

    this._statsDirty = false;
  }

  getMacroPercentage(value: string, type: 'protein' | 'carbs' | 'fats'): number {
    const numValue = parseFloat(value || '0');
    if (!numValue || !this.dataSource.data.length) return 0;

    let maxValue = 0;
    switch (type) {
      case 'protein':
        maxValue = Math.max(...this.dataSource.data.map((i: any) => parseFloat(i.proteina_g || '0')));
        break;
      case 'carbs':
        maxValue = Math.max(...this.dataSource.data.map((i: any) => parseFloat(i.hidratos_de_carbono_g || '0')));
        break;
      case 'fats':
        maxValue = Math.max(...this.dataSource.data.map((i: any) => parseFloat(i.lipidos_g || '0')));
        break;
    }
    return maxValue > 0 ? Math.min((numValue / maxValue) * 100, 100) : 0;
  }

  retryLoad(): void {
    this.obtenerDietas();
  }

  exportData(): void {
    console.log('Exportando datos...', this.filteredData);
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

  openModalAlimentos(item?: any, edit?: boolean): void {
    const modalRef = this.modalService.open(AltaAlimento, {
      backdrop: 'static',
      size: 'lg',
      scrollable: true
    });

    if (item && edit) {
      // modalRef.componentInstance.alimentoData = item;
      // modalRef.componentInstance.isEdit = true;
    }

    modalRef.result.then(
      (result) => {
        if (result && result.success) {
          console.log('Alimento creado exitosamente:', result.data);
          this.obtenerDietas();
        }
      },
      (dismissed) => {
        console.log('Modal cerrado sin guardar');
      }
    );
  }

  // Getters para las columnas responsive
  get currentDisplayedColumns(): string[] {
    if (this.isTablet) {
      return this.displayedColumnsTablet;
    }
    return this.displayedColumns;
  }
}