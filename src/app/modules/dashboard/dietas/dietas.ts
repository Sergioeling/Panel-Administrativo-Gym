import { AfterViewInit, Component, ViewChild, inject, OnInit, OnDestroy, ChangeDetectionStrategy, TrackByFunction } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil } from 'rxjs';
import { HttpServices } from '../../../core/services/http/http.service';

@Component({
  selector: 'app-dietas',
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
  templateUrl: './dietas.html',
  styleUrl: './dietas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Dietas implements OnInit, AfterViewInit, OnDestroy {
  private http = inject(HttpServices);
  private destroy$ = new Subject<void>();

  loading = false;
  errorMsg: string | null = null;
  search = '';
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

  dataSource = new MatTableDataSource<any>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.obtenerDietas();

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
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  obtenerDietas(): void {
    this.loading = true;
    this.errorMsg = null;

    this.http.obtenerDietas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp: any) => {
          const payload = resp?.data ?? resp;
          const data: any[] = Array.isArray(payload) ? payload : (payload ? [payload] : []);
          this.dataSource.data = data;
          if (this.paginator) this.dataSource.paginator = this.paginator;
          if (this.sort) this.dataSource.sort = this.sort;
          this._statsDirty = true;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error al obtener dietas:', err);
          this.errorMsg = 'No se pudieron cargar las dietas. Intenta nuevamente.';
          this.loading = false;
        }
      });
  }

  applyFilter(value: string): void {
    this.search = value ?? '';
    this.dataSource.filter = this.search.trim().toLowerCase();
    this.dataSource.paginator?.firstPage();
  }

  clearSearch(): void {
    this.search = '';
    this.dataSource.filter = '';
    this.dataSource.paginator?.firstPage();
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
}
