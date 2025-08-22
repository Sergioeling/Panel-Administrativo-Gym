import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';

//import { Login } from '../auth/login/login';  // 👈 importa tu LoginComponent
import { Login } from '../../auth/login/login';  // 👈 importa tu LoginComponent

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
  private modalService = inject(NgbModal);   // 👈 añadimos NgbModal

  registerForm: FormGroup = this.fb.group({
    nombre: ['', Validators.required],
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit() {
    if (this.registerForm.valid) {
      console.log('Datos de registro:', this.registerForm.value);
      this.activeModal.close(this.registerForm.value); // ✅ cierra modal y retorna datos
    }
  }

  close() {
    this.activeModal.dismiss(); // ✅ cierra el modal de registro
    this.modalService.open(Login, { 
      backdrop: 'static',
      size: 'lg' }); // ✅ abre modal de login otra vez
  }
}

