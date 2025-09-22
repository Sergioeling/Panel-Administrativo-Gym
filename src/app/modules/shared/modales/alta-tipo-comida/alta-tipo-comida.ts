import { Component, inject, OnInit, OnDestroy, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import { HttpServices } from '../../../../core/services/http/http.service';
import Swal from 'sweetalert2';

interface TipoComidaData {
  id?: string;
  nombre: string;
  descripcion?: string;
}

@Component({
  selector: 'app-alta-tipo-comida',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './alta-tipo-comida.html',
  styleUrl: './alta-tipo-comida.scss'
})
export class AltaTipoComida implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private http = inject(HttpServices);
  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);
  public activeModal = inject(NgbActiveModal);

  @Input() tipoComidaData: TipoComidaData | null = null;
  @Input() isEdit: boolean = false;

  loading = false;
  errorMsg: string | null = null;
  comidaForm: FormGroup;

  constructor() {
    this.comidaForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: ['', [Validators.maxLength(200)]]
    });
  }

  ngOnInit(): void {
    if (this.isEdit && this.tipoComidaData) {
      this.cargarDatosComida();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarDatosComida(): void {
    if (!this.tipoComidaData) return;

    const comidaFormData: any = {};
    Object.keys(this.comidaForm.controls).forEach(key => {
      comidaFormData[key] = this.tipoComidaData![key as keyof TipoComidaData] || '';
    });

    this.comidaForm.patchValue(comidaFormData);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.comidaForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.comidaForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `El campo ${fieldName} es requerido`;
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['maxlength']) return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
    }
    return '';
  }

  onSubmit(): void {
    if (this.comidaForm.invalid) {
      this.markFormGroupTouched();
      this.scrollToFirstError();
      return;
    }

    this.loading = true;
    this.errorMsg = null;

    const formData = this.comidaForm.value;

    if (this.isEdit && this.tipoComidaData?.id) {
      formData.id = this.tipoComidaData.id;
    }

    const action = this.isEdit ? 'actualizar' : 'crear';

    Swal.fire({
      title: this.isEdit ? 'Actualizando tipo de comida...' : 'Creando tipo de comida...',
      text: 'Por favor espera',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const serviceCall = this.isEdit
      ? this.http.put('tipos-comida', formData)
      : this.http.crearTipoComida(formData); // 👈 asegúrate de tener este método en tu servicio

    serviceCall
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          Swal.close();

          Swal.fire({
            icon: 'success',
            title: this.isEdit ? '¡Tipo de comida actualizado!' : '¡Tipo de comida creado!',
            text: response.message || `Tipo de comida ${action} exitosamente`,
            timer: 2000,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
          });

          this.activeModal.close(response);
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
    Object.keys(this.comidaForm.controls).forEach(key => {
      const control = this.comidaForm.get(key);
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
    return this.isEdit ? 'Editar Tipo de Comida' : 'Crear Nuevo Tipo de Comida';
  }

  get submitButtonText(): string {
    return this.isEdit ? 'Actualizar Comida' : 'Crear Comida';
  }
}
