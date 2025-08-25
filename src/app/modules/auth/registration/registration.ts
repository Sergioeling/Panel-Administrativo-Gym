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
    confirmarContrasena: ['', Validators.required]
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

      const formData = this.registerForm.value;

      const data = {
        user_id: this.userid(),
        nombre: formData.nombre,
        correo: formData.correo,
        contrasena: formData.contrasena,
        rol: 'nutricionista'
      };

      this.http.crearUsuario(data).subscribe({
        next: (res) => {
          console.log('Usuario creado:', res);

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
}