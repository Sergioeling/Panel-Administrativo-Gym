import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { HttpServices } from '../../../core/services/http/http.service';
import { Login } from '../../auth/login/login';
import Swal from 'sweetalert2';
import { Router } from '@angular/router'; //----
import { AuthServices } from '../../../core/services/auth/auth.service';//---

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './registration.html',
  styleUrls: ['./registration.scss']
})
export class RegistrationComponent {
  private fb = inject(FormBuilder);
  public activeModal = inject(NgbActiveModal);
  private modalService = inject(NgbModal);
  private http = inject(HttpServices);
  private authService = inject(AuthServices);
  private router = inject(Router);
  private isLoading = false;   

  registerForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required,
    Validators.minLength(3),
    Validators.maxLength(50),
    Validators.pattern(/^[a-zA-Z\s]+$/)]],
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.minLength(6)]],
    confirmarContrasena: ['', Validators.required],
    titulo: [null, [Validators.required, this.fileTypeValidator(['pdf','jpg','png'])]],    
    ine: [null, [Validators.required, this.fileTypeValidator(['pdf','jpg','png'])]],
    domicilio: [null, [Validators.required, this.fileTypeValidator(['pdf','jpg','png'])]],
  },
    { validators: this.passwordsMatchValidator }
  );

  passwordsMatchValidator(formGroup: AbstractControl): ValidationErrors | null {
    const password = formGroup.get('contrasena')?.value;
    const confirmPassword = formGroup.get('confirmarContrasena')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  close() {
    this.activeModal.dismiss();
    this.modalService.open(Login, {
      backdrop: 'static',
      size: 'lg'
    });
  }

  
onSubmit() {
  if (this.registerForm.valid && !this.isLoading) {
    this.isLoading = true;

    const formValues = this.registerForm.value;

    const formData = new FormData();
    
    // Agregar datos de texto
    formData.append('user_id', this.userid());
    formData.append('nombre', formValues.nombre);
    formData.append('correo', formValues.correo);
    formData.append('contrasena', formValues.contrasena);
    formData.append('rol', 'nutricionista');
    
    if (formValues.titulo) {
      formData.append('titulo', formValues.titulo, formValues.titulo.name);
    }
    if (formValues.ine) {
      formData.append('ine', formValues.ine, formValues.ine.name);
    }
    if (formValues.domicilio) {
      formData.append('domicilio', formValues.domicilio, formValues.domicilio.name);
    }

    this.http.crearUsuario(formData).subscribe({
      next: (res) => {
        Swal.fire({
          title: 'Registro exitoso',
          text: 'Tu cuenta ha sido creada correctamente',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
          timerProgressBar: true
        });

        setTimeout(() => {
          this.activeModal.close('success');
        }, 3000);

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al crear usuario:', err);

        Swal.fire({
          title: 'Error',
          text: 'No se pudo crear el usuario. Intenta de nuevo',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });

        this.isLoading = false;
      }
    });
  } else {
    this.markFormGroupTouched();
  }
}

  private markFormGroupTouched() {
    Object.keys(this.registerForm.controls).forEach(key => {
      const control = this.registerForm.get(key);
      control?.markAsTouched();
    });
  }
  
  userid() {
    const formData = this.registerForm.value;
    const base = formData.nombre.replace(/\s+/g, '').toLowerCase();
    return base + '_' + Date.now();
  }


  fileTypeValidator(allowedTypes: string[]) {
  return (control: AbstractControl): ValidationErrors | null => {
    const file = control.value;
    if (file && file instanceof File) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension && !allowedTypes.includes(extension)) {
        return { invalidFileType: true };
      }
    }
    return null;
  };
}


onFileSelected(event: Event, controlName: string): void {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    const file = input.files[0];
    this.registerForm.patchValue({
      [controlName]: file
    });
    this.registerForm.get(controlName)?.markAsTouched();
    this.registerForm.get(controlName)?.updateValueAndValidity();
  }
}

}