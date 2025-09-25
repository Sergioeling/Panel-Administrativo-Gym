import { Component, inject, OnInit, OnDestroy, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import { HttpServices } from '../../../../core/services/http/http.service';
import Swal from 'sweetalert2';

interface TipoDietaData {
  id?: string;
  nombre: string;
  descripcion?: string;
}

@Component({
  selector: 'app-alta-tipo-dieta',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './alta-tipo-dieta.html',
  styleUrl: './alta-tipo-dieta.scss'
})
export class AltaTipoDieta implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private http = inject(HttpServices);
  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);
  public activeModal = inject(NgbActiveModal);

  @Input() tipoDietaData: TipoDietaData | null = null;
  @Input() isEdit: boolean = false;

  loading = false;
  errorMsg: string | null = null;
  dietaForm: FormGroup;

  constructor() {
    this.dietaForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: ['', [Validators.maxLength(200)]]
    });
  }

  ngOnInit(): void {
    if (this.isEdit && this.tipoDietaData) {
      this.cargarDatosDieta();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarDatosDieta(): void {
    if (!this.tipoDietaData) return;

    const dietaFormData: any = {};
    Object.keys(this.dietaForm.controls).forEach(key => {
      dietaFormData[key] = this.tipoDietaData![key as keyof TipoDietaData] || '';
    });

    this.dietaForm.patchValue(dietaFormData);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.dietaForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.dietaForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `El campo ${fieldName} es requerido`;
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['maxlength']) return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
    }
    return '';
  }

  onSubmit(): void {
    if (this.dietaForm.invalid) {
      this.markFormGroupTouched();
      this.scrollToFirstError();
      return;
    }

    this.loading = true;
    this.errorMsg = null;

    const formData = this.dietaForm.value;

    if (this.isEdit && this.tipoDietaData?.id) {
      formData.id = this.tipoDietaData.id;
    }

    const action = this.isEdit ? 'actualizar' : 'crear';

    Swal.fire({
      title: this.isEdit ? 'Actualizando dieta...' : 'Creando dieta...',
      text: 'Por favor espera',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const serviceCall = this.isEdit
      ? this.http.actualizarTipoDieta(formData)
      : this.http.crearTipoDieta(formData); 

    serviceCall
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          Swal.close();

          Swal.fire({
            icon: 'success',
            title: this.isEdit ? '¡Dieta actualizada!' : '¡Dieta creada!',
            text: response.message || `Dieta ${action} exitosamente`,
            timer: 2000,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
          });

          this.activeModal.close({
            success: true,
            data: response.data
          });
        },
        error: (error) => {
          this.loading = false;
          Swal.close();

          let errorMessage = 'Error desconocido';

          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.message) {
            errorMessage = error.message;
          }

          this.errorMsg = errorMessage;

          Swal.fire({
            icon: 'error',
            title: '¡Error!',
            text: errorMessage,
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#E74C3C'
          });
          this.cdr.detectChanges();
        }
      });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.dietaForm.controls).forEach(key => {
      const control = this.dietaForm.get(key);
      control?.markAsTouched();
      control?.markAsDirty();
    });
  }

  private scrollToFirstError(): void {
    setTimeout(() => {
      const firstErrorElement = document.querySelector('.is-invalid');
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  onCancel(): void {
    this.activeModal.dismiss();
  }

  clearError(): void {
    this.errorMsg = null;
  }

  get modalTitle(): string {
    return this.isEdit ? 'Editar Dieta' : 'Crear Nueva Dieta';
  }

  get submitButtonText(): string {
    return this.isEdit ? 'Actualizar Dieta' : 'Crear Dieta';
  }
}
