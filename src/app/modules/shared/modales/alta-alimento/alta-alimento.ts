import { Component, inject, OnDestroy, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { HttpServices } from '../../../../core/services/http/http.service';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';


interface Categoria {
  id: any;
  nombre: string;
  descripcion?: string;
}

interface AlimentoData {
  id?: string;
  nombre: string;
  categoria_id: any;
  cantidad_sugerida: string;
  unidad: string;
  peso_bruto_g: string;
  peso_neto_g: string;
  energia_kcal: string;
  proteina_g: string;
  lipidos_g: string;
  hidratos_de_carbono_g: string;
  ag_saturados_g: string;
  ag_monoinsaturados_g: string;
  ag_poli_insaturados_g: string;
  colesterol_mg: string;
  azucar_g: string;
  fibra_g: string;
  etanol_g: string;
  vitamina_a_mg_re: string;
  acido_ascorbico_mg: string;
  acido_folico_mg: string;
  calcio_mg: string;
  hierro_mg: string;
  potasio_mg: string;
  sodio_mg: string;
  fosforo_mg: string;
  ig: string;
  carga_glicemica: string;
}

@Component({
  selector: 'app-alta-alimento',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './alta-alimento.html',
  styleUrl: './alta-alimento.scss'
})
export class AltaAlimento implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private http = inject(HttpServices);
  private destroy$ = new Subject<void>();
  public activeModal = inject(NgbActiveModal);

  // Props de entrada
  @Input() alimentoData: AlimentoData | null = null;
  @Input() isEdit: boolean = false;

  loading = false;
  loadingCategorias = false;
  errorMsg: string | null = null;
  categorias: Categoria[] = [];
  alimentoForm: FormGroup;

  constructor() {
    this.alimentoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      categoria_id: [{ value: '', disabled: false }, Validators.required],
      cantidad_sugerida: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      unidad: ['g', Validators.required],
      peso_bruto_g: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      peso_neto_g: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      energia_kcal: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      proteina_g: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      lipidos_g: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      hidratos_de_carbono_g: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      ag_saturados_g: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      ag_monoinsaturados_g: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      ag_poli_insaturados_g: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      colesterol_mg: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      azucar_g: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      fibra_g: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      etanol_g: ['0', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      vitamina_a_mg_re: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      acido_ascorbico_mg: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      acido_folico_mg: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      calcio_mg: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      hierro_mg: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      potasio_mg: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      sodio_mg: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      fosforo_mg: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      ig: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      carga_glicemica: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]]
    });
  }

  ngOnInit(): void {
    this.obtenerCategorias();
    if (this.isEdit && this.alimentoData) {
      this.cargarDatosAlimento();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarDatosAlimento(): void {
    if (!this.alimentoData) return;
    const alimentoFormData: any = {};
    Object.keys(this.alimentoForm.controls).forEach(key => {
      const value = (this.alimentoData as any)?.[key];
      alimentoFormData[key] = value !== null && value !== undefined ? value.toString() : '';
    });
    this.alimentoForm.patchValue(alimentoFormData);
    this.alimentoForm.markAsTouched();
  }

  obtenerCategorias(): void {
    this.loadingCategorias = true;


    this.http.obtenerCategoria()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.loadingCategorias = false;

          if (response?.status === 'success' && response?.data && Array.isArray(response.data)) {
            this.categorias = response.data;
          } else if (response?.data && Array.isArray(response.data)) {
            this.categorias = response.data;
          } else {
            this.categorias = this.getCategoriasFallback();
          }
          this.alimentoForm.get('categoria_id')?.enable();
        },
        error: (error) => {
          this.loadingCategorias = false;
          this.errorMsg = error?.error?.message || 'Error al obtener las categorías. Intenta nuevamente.';

          this.categorias = this.getCategoriasFallback();
          this.alimentoForm.get('categoria_id')?.enable();
        }
      });
  }

  get categoriaOptions(): Categoria[] {
    return this.categorias;
  }

  get isLoadingCategorias(): boolean {
    return this.loadingCategorias;
  }

  get categoriasLoaded(): boolean {
    return this.categorias.length > 0;
  }

  private getCategoriasFallback(): Categoria[] {
    return [
      { id: '1', nombre: 'Frutas' },
      { id: '2', nombre: 'Verduras' },
      { id: '3', nombre: 'Cereales' },
      { id: '4', nombre: 'Legumbres' },
      { id: '5', nombre: 'Carnes' },
      { id: '6', nombre: 'Lácteos' },
      { id: '7', nombre: 'Grasas' },
      { id: '8', nombre: 'Pescados y Mariscos' },
      { id: '9', nombre: 'Huevos' },
      { id: '10', nombre: 'Bebidas' },
      { id: '11', nombre: 'Dulces y Postres' },
      { id: '12', nombre: 'Snacks' },
      { id: '13', nombre: 'Condimentos y Especias' },
      { id: '14', nombre: 'Otros' }
    ];
  }

  get unidadOptions() {
    return ['g', 'ml', 'unidad', 'taza', 'cucharada', 'cucharadita', 'rebanada', 'porción'];
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.alimentoForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.alimentoForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['minlength']) return 'Mínimo 2 caracteres';
      if (field.errors['pattern']) return 'Formato numérico inválido (usar punto decimal)';
    }
    return '';
  }

  onSubmit(): void {
    if (this.alimentoForm.invalid) {
      this.markFormGroupTouched();
      this.scrollToFirstError();
      Swal.fire({
        icon: 'warning',
        title: 'Formulario incompleto',
        text: 'Revisa los campos marcados en rojo.'
      });
      return;
    }

    this.loading = true;
    this.errorMsg = null;

    const rawFormData = this.alimentoForm.value;
    const formData = this.cleanFormData(rawFormData);

    if (this.isEdit && this.alimentoData?.id) {
      formData.id = this.alimentoData.id;
    }

    const action = this.isEdit ? 'actualizar' : 'crear';

    // Loading
    Swal.fire({
      title: this.isEdit ? 'Actualizando alimento...' : 'Creando alimento...',
      text: 'Por favor espera',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => { Swal.showLoading(); }
    });

    const serviceCall = this.isEdit
      ? this.http.actualizarAlimento(formData)
      : this.http.crearAlimento(formData);

    serviceCall
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          Swal.fire({
            icon: 'success',
            title: this.isEdit ? 'Alimento actualizado' : 'Alimento creado',
            text: 'Se guardó correctamente.',
            confirmButtonText: 'Aceptar'
          }).then(() => {
            this.activeModal.close({
              success: true,
              data: response,
              isEdit: this.isEdit
            });
          });
        },
        error: (error) => {
          this.loading = false;
          const msg = error?.error?.message || `Error al ${action} el alimento. Intenta nuevamente.`;
          this.errorMsg = msg;
          Swal.fire({
            icon: 'error',
            title: `Error al ${action}`,
            text: msg
          });
        }
      });
  }


  private cleanFormData(rawData: any): any {
    const cleanData: any = {};
    Object.keys(rawData).forEach(key => {
      const value = rawData[key];
      if (value !== null && value !== undefined && value !== '') {
        cleanData[key] = value.toString().trim();
      }
    });

    return cleanData;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.alimentoForm.controls).forEach(key => {
      const control = this.alimentoForm.get(key);
      control?.markAsTouched();
      control?.markAsDirty();
    });
  }

  private scrollToFirstError(): void {
    setTimeout(() => {
      const firstErrorElement = document.querySelector('.is-invalid');
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }, 100);
  }

  onCancel(): void {
    this.activeModal.dismiss();
  }

  clearError(): void {
    this.errorMsg = null;
  }

  setDefaultValues(): void {
    this.alimentoForm.patchValue({
      nombre: 'Manzana roja',
      categoria_id: '1',
      cantidad_sugerida: '100',
      unidad: 'g',
      peso_bruto_g: '120',
      peso_neto_g: '100',
      energia_kcal: '52',
      proteina_g: '0.3',
      lipidos_g: '0.2',
      hidratos_de_carbono_g: '14',
      ag_saturados_g: '0.04',
      ag_monoinsaturados_g: '0.01',
      ag_poli_insaturados_g: '0.05',
      colesterol_mg: '0',
      azucar_g: '10.4',
      fibra_g: '2.4',
      etanol_g: '0',
      vitamina_a_mg_re: '0.05',
      acido_ascorbico_mg: '4.6',
      acido_folico_mg: '3',
      calcio_mg: '6',
      hierro_mg: '0.12',
      potasio_mg: '150',
      sodio_mg: '1',
      fosforo_mg: '11',
      ig: '40',
      carga_glicemica: '6'
    });
  }

  get hasValidNumericFields(): boolean {
    const numericFields = [
      'cantidad_sugerida', 'peso_bruto_g', 'peso_neto_g', 'energia_kcal',
      'proteina_g', 'lipidos_g', 'hidratos_de_carbono_g',
      'ag_saturados_g', 'ag_monoinsaturados_g', 'ag_poli_insaturados_g',
      'colesterol_mg', 'azucar_g', 'fibra_g', 'etanol_g',
      'vitamina_a_mg_re', 'acido_ascorbico_mg', 'acido_folico_mg',
      'calcio_mg', 'hierro_mg', 'potasio_mg', 'sodio_mg', 'fosforo_mg',
      'ig', 'carga_glicemica'
    ];

    return numericFields.every(field => {
      const control = this.alimentoForm.get(field);
      return control && control.valid;
    });
  }

  get completionPercentage(): number {
    const totalFields = Object.keys(this.alimentoForm.controls).length;
    const completedFields = Object.keys(this.alimentoForm.controls)
      .filter(key => {
        const control = this.alimentoForm.get(key);
        return control && control.value && control.valid;
      }).length;

    return Math.round((completedFields / totalFields) * 100);
  }

  get modalTitle(): string {
    return this.isEdit ? 'Editar Alimento' : 'Agregar Nuevo Alimento';
  }

  get submitButtonText(): string {
    if (this.loading) {
      return this.isEdit ? 'Actualizando...' : 'Guardando...';
    }
    return this.isEdit ? 'Actualizar Alimento' : 'Guardar Alimento';
  }

  trackByCategoria(index: number, categoria: Categoria): string {
    return categoria.id;
  }
}