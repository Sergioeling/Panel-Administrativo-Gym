import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { HttpServices } from '../../../../core/services/http/http.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-alta-alimento',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './alta-alimento.html',
  styleUrl: './alta-alimento.scss'
})
export class AltaAlimento implements OnDestroy {
  private fb = inject(FormBuilder);
  private http = inject(HttpServices);
  private destroy$ = new Subject<void>();
  
  public activeModal = inject(NgbActiveModal);
  
  loading = false;
  errorMsg: string | null = null;
  
  alimentoForm: FormGroup;

  constructor() {
    this.alimentoForm = this.fb.group({
      // CAMPOS BÁSICOS OBLIGATORIOS
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      categoria_id: ['', Validators.required],
      cantidad_sugerida: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      unidad: ['g', Validators.required],
      peso_bruto_g: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      peso_neto_g: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      energia_kcal: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      
      // MACRONUTRIENTES OBLIGATORIOS
      proteina_g: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      lipidos_g: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      hidratos_de_carbono_g: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      
      // ÁCIDOS GRASOS OBLIGATORIOS
      ag_saturados_g: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      ag_monoinsaturados_g: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      ag_poli_insaturados_g: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      
      // OTROS COMPONENTES OBLIGATORIOS
      colesterol_mg: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      azucar_g: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      fibra_g: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      etanol_g: ['0', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      
      // VITAMINAS OBLIGATORIAS
      vitamina_a_mg_re: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      acido_ascorbico_mg: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      acido_folico_mg: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      
      // MINERALES OBLIGATORIOS
      calcio_mg: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      hierro_mg: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      potasio_mg: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      sodio_mg: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      fosforo_mg: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      
      // ÍNDICE GLICÉMICO OBLIGATORIO
      ig: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      carga_glicemica: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]]
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get categoriaOptions() {
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
    console.log('🚀 Estado del formulario:', this.alimentoForm.valid);
    console.log('🚀 Errores del formulario:', this.alimentoForm.errors);
    
    if (this.alimentoForm.valid) {
      this.loading = true;
      this.errorMsg = null;
      
      // Procesar el form data
      const rawFormData = this.alimentoForm.value;
      const formData = this.cleanFormData(rawFormData);
      
      // Debug: mostrar qué se va a enviar
      console.log('🚀 Datos que se enviarán al servidor:', formData);
      
      this.http.crearAlimento(formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.loading = false;
            console.log('✅ Alimento creado exitosamente:', response);
            this.activeModal.close({ success: true, data: response });
          },
          error: (error) => {
            this.loading = false;
            console.error('❌ Error al crear alimento:', error);
            this.errorMsg = error?.error?.message || 'Error al crear el alimento. Intenta nuevamente.';
          }
        });
    } else {
      console.log('❌ Formulario inválido, marcando campos como touched');
      this.markFormGroupTouched();
      this.scrollToFirstError();
    }
  }

  private cleanFormData(rawData: any): any {
    const cleanData: any = {};
    
    // Convertir todos los campos a string y limpiar
    Object.keys(rawData).forEach(key => {
      const value = rawData[key];
      if (value !== null && value !== undefined && value !== '') {
        // Convertir a string y limpiar espacios
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
    // Buscar el primer campo con error y hacer scroll hacia él
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

  // Método para prellenar con valores por defecto (útil para testing)
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

  // Método para validar si todos los campos numéricos son válidos
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

  // Método para obtener el porcentaje de campos completados
  get completionPercentage(): number {
    const totalFields = Object.keys(this.alimentoForm.controls).length;
    const completedFields = Object.keys(this.alimentoForm.controls)
      .filter(key => {
        const control = this.alimentoForm.get(key);
        return control && control.value && control.valid;
      }).length;
    
    return Math.round((completedFields / totalFields) * 100);
  }
}