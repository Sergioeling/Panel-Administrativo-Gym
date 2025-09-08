import { Component, inject, OnInit, OnDestroy, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import { HttpServices } from '../../../../core/services/http/http.service';
import Swal from 'sweetalert2';

interface UsuarioData {
  id?: string;
  user_id: string;
  nombre: string;
  correo: string;
  contrasena: string;
  rol: string;
}

@Component({
  selector: 'app-alta-usuarios',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './alta-usuarios.html',
  styleUrl: './alta-usuarios.scss'
})
export class AltaUsuarios implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private http = inject(HttpServices);
  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);
  public activeModal = inject(NgbActiveModal);

  @Input() usuarioData: UsuarioData | null = null;
  @Input() isEdit: boolean = false;

  loading = false;
  errorMsg: string | null = null;
  usuarioForm: FormGroup;
  showPassword = false;

  constructor() {
    this.usuarioForm = this.fb.group({
      user_id: ['', [Validators.required, Validators.minLength(3)]],
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      correo: ['', [Validators.required, Validators.email]],
      contrasena: ['', [Validators.required, Validators.minLength(6)]],
      rol: ['nutricionista', Validators.required]
    });

    this.usuarioForm.get('nombre')?.valueChanges.subscribe(() => {
      this.generateUserId();
    });

    this.usuarioForm.get('correo')?.valueChanges.subscribe(() => {
      this.generateUserId();
    });
  }

  ngOnInit(): void {
    if (this.isEdit && this.usuarioData) {
      this.cargarDatosUsuario();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarDatosUsuario(): void {
    if (!this.usuarioData) return;

    const usuarioFormData: any = {};
    Object.keys(this.usuarioForm.controls).forEach(key => {
      usuarioFormData[key] = this.usuarioData![key as keyof UsuarioData] || '';
    });

    if (this.isEdit) {
      usuarioFormData.contrasena = '';
      this.usuarioForm.get('contrasena')?.setValidators([Validators.minLength(6)]);
    }

    this.usuarioForm.patchValue(usuarioFormData);
  }

  get rolOptions() {
    return [
      { value: 'nutricionista', label: 'Nutricionista' },
      { value: 'admin', label: 'Administrador' }
    ];
  }

  private generateUserId(): void {
    const nombre = this.usuarioForm.get('nombre')?.value?.trim() || '';
    const correo = this.usuarioForm.get('correo')?.value?.trim() || '';

    if (nombre.length >= 2 || correo.length >= 3) {
      let userId = '';

      if (nombre.length >= 2) {
        userId += this.cleanString(nombre.split(' ')[0].substring(0, 3));
      }

      if (correo.includes('@')) {
        const emailPart = correo.split('@')[0];
        userId += this.cleanString(emailPart.substring(0, 2));
      } else if (correo.length >= 2) {
        userId += this.cleanString(correo.substring(0, 2));
      }

      const today = new Date();
      const year = today.getFullYear().toString().slice(-2);
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const day = today.getDate().toString().padStart(2, '0');
      userId += year + month + day;

      userId = userId.toLowerCase();

      if (this.usuarioForm.get('user_id')?.value !== userId) {
        this.usuarioForm.get('user_id')?.setValue(userId, { emitEvent: false });
      }
    }
  }

  private cleanString(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.usuarioForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.usuarioForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `El campo ${fieldName} es requerido`;
      if (field.errors['email']) return 'Formato de email inválido';
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
    }
    return '';
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.usuarioForm.invalid) {
      this.markFormGroupTouched();
      this.scrollToFirstError();
      return;
    }

    this.loading = true;
    this.errorMsg = null;

    const formData = this.usuarioForm.value;

    if (this.isEdit && this.usuarioData?.id) {
      formData.id = this.usuarioData.id;
    }

    const action = this.isEdit ? 'actualizar' : 'crear';

    Swal.fire({
      title: this.isEdit ? 'Actualizando usuario...' : 'Creando usuario...',
      text: 'Por favor espera',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const serviceCall = this.isEdit
      ? this.http.put('usuarios', formData)
      : this.http.crearUsuario(formData);

    serviceCall
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          Swal.close();

          Swal.fire({
            icon: 'success',
            title: this.isEdit ? '¡Usuario actualizado!' : '¡Usuario creado!',
            text: response.message || `Usuario ${action} exitosamente`,
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
    Object.keys(this.usuarioForm.controls).forEach(key => {
      const control = this.usuarioForm.get(key);
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
    return this.isEdit ? 'Editar Usuario' : 'Crear Nuevo Usuario';
  }

  get submitButtonText(): string {
    return this.isEdit ? 'Actualizar Usuario' : 'Crear Usuario';
  }

  trackByRol(index: number, rol: any): string {
    return rol.value;
  }
}
