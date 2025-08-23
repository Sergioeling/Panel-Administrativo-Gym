import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { HttpServices } from '../../../core/services/http/http.service';

import { Login } from '../../auth/login/login';

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

  registerForm: FormGroup = this.fb.group({
    nombre: ['', Validators.required],
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.minLength(6)]],
    confirmarContrasena: ['', Validators.required]
  },
    { validators: this.passwordsMatchValidator }
  );


   ngOnInit(): void {
   this.CreateUser();
  }
  


  passwordsMatchValidator(formGroup: AbstractControl): ValidationErrors | null {
    const password = formGroup.get('contrasena')?.value;
    const confirmPassword = formGroup.get('confirmarContrasena')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }


  onSubmit() {
    if (this.registerForm.valid) {
      console.log('Datos de registro:', this.registerForm.value);
      this.activeModal.close(this.registerForm.value);
    }
  }

  close() {
    this.activeModal.dismiss();
    this.modalService.open(Login, {
      backdrop: 'static',
      size: 'lg'
    });
  }

  userid(){
    //generAR ID EN BASE  A LO QUE LLEE EL USUARIO EN NOMBRE, CORREO ETC
  }

  CreateUser() {
    const data = {
      user_id: this.userid(),
      nombre: 'Eduardokmddksss',
      correo: 'teskkkddjkt@tess444t.com',
      contrasena: "1256k88jjdj",
      rol: 'nutricionista'
    };

    this.http.crearUsuario(data).subscribe({
      next: (res) => {
        console.log('Usuario creado:', res);
      }
    });
  }

}


