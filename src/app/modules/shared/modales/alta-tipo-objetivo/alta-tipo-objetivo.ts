import { Component, inject, OnInit, OnDestroy, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import { HttpServices } from '../../../../core/services/http/http.service';
import Swal from 'sweetalert2';

interface TipoObjetivoData {
  id?: string;
  nombre: string;
  descripcion?: string;
}

@Component({
  selector: 'app-alta-tipo-objetivo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './alta-tipo-objetivo.html',
  styleUrl: './alta-tipo-objetivo.scss'
})
export class AltaTipoObjetivo implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private http = inject(HttpServices);
  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);
  public activeModal = inject(NgbActiveModal);

  @Input() tipoObjetivoData: TipoObjetivoData | null = null;
  @Input() isEdit: boolean = false;

  loading = false;
  errorMsg: string | null = null;
  objetivoForm: FormGroup;

  constructor() {
    this.objetivoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: ['', [Validators.maxLength(200)]]
    });
  }

  ngOnInit(): void {
    if (this.isEdit && this.tipoObjetivoData) {
      this.cargarDatosObjetivo();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarDatosObjetivo(): void {
    if (!this.tipoObjetivoData) return;

    const objetivoFormData: any = {};
    Object.keys(this.objetivoForm.controls).forEach(key => {
      objetivoFormData[key] = this.tipoObjetivoData![key as keyof TipoObjetivoData] || '';
    });

    this.objetivoForm.patchValue(objetivoFormData);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.objetivoForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.objetivoForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `El campo ${fieldName} es requerido`;
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['maxlength']) return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
    }
    return '';
  }

  onSubmit(): void {
    if (this.objetivoForm.invalid) {
      this.markFormGroupTouched();
      this.scrollToFirstError();
      return;
    }

    this.loading = true;
    this.errorMsg = null;

    const formData = this.objetivoForm.value;

    if (this.isEdit && this.tipoObjetivoData?.id) {
      formData.id = this.tipoObjetivoData.id;
    }

    const action = this.isEdit ? 'actualizar' : 'crear';

    Swal.fire({
      title: this.isEdit ? 'Actualizando objetivo...' : 'Creando objetivo...',
      text: 'Por favor espera',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const serviceCall = this.isEdit
      ? this.http.actualizarTipoObjetivo(formData)
      : this.http.crearTipoObjetivo(formData);

    serviceCall
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          Swal.close();

          Swal.fire({
            icon: 'success',
            title: this.isEdit ? '¡Objetivo actualizado!' : '¡Objetivo creado!',
            text: response.message || `Objetivo ${action} exitosamente`,
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
    Object.keys(this.objetivoForm.controls).forEach(key => {
      const control = this.objetivoForm.get(key);
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
    return this.isEdit ? 'Editar Objetivo' : 'Crear Nuevo Objetivo';
  }

  get submitButtonText(): string {
    return this.isEdit ? 'Actualizar Objetivo' : 'Crear Objetivo';
  }
}
