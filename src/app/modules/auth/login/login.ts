import { Component, inject, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthServices } from '../../../core/services/auth/auth.service';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import Swal from 'sweetalert2';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NgIf } from '@angular/common';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { RegistrationComponent } from '../../auth/registration/registration'; // ajusta la ruta

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    NgIf
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
  encapsulation: ViewEncapsulation.None
})
export class Login {
  public activeModal = inject(NgbActiveModal);
  private fb = inject(FormBuilder);
  private authService = inject(AuthServices);
  private router = inject(Router);

  loginForm: FormGroup;
  isLoading = false;
  hidePassword = true;

  constructor() {
    this.loginForm = this.fb.group({
      correo: ['', [Validators.required, Validators.email]],
      contrasena: ['', [Validators.required, Validators.minLength(6)]]
    });

    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit() {
    if (this.loginForm.valid && !this.isLoading) {
      this.isLoading = true;

      const credenciales = this.loginForm.value;

      this.authService.login(credenciales).subscribe({
        next: (response) => {
          this.activeModal.close('success');
          setTimeout(() => {
            const userRole = this.authService.getUserRole();
            if (userRole) {
              this.router.navigate(['/dashboard']);
              window.location.reload();
            }
          }, 100);

          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error en login:', error);
          this.isLoading = false;
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  getErrorMessage(fieldName: string): string {
    const field = this.loginForm.get(fieldName);

    if (field?.hasError('required')) {
      return `${fieldName === 'correo' ? 'Email' : 'Contraseña'} es requerido`;
    }

    if (field?.hasError('email')) {
      return 'Email no válido';
    }

    if (field?.hasError('minlength')) {
      return 'La contraseña debe tener al menos 6 caracteres';
    }

    return '';
  }

  togglePasswordVisibility() {
    this.hidePassword = !this.hidePassword;
  }

  goToRegister() {
    Swal.fire({
      title: 'Registro',
      text: 'Contacta al administrador para crear una cuenta',
      icon: 'info'
    });
  }

  modalService = inject(NgbModal);

  openRegister() {
    this.activeModal.close();

    this.modalService.open(RegistrationComponent, { 
      backdrop: 'static',
      size: 'lg' });
  }
}
