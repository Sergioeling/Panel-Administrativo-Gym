import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthServices } from '../../../core/services/auth/auth.service';//---1
import { HttpServices } from '../../../core/services/http/http.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './perfil.html',
  styleUrls: ['./perfil.scss']  
})
export class Perfil {
  editMode = false; 
  cambiarPassMode = false; 
  perfilForm: FormGroup;
  passwordForm: FormGroup;
  private originalData: any; 

  private authService = inject(AuthServices)//---------2
  protected httpService = inject(HttpServices);

  constructor(private fb: FormBuilder) {
    this.perfilForm = this.fb.group({
      nombre: ['Admin PowerGym', Validators.required],
      email: ['admin@powergym.com', [Validators.required, Validators.email]],
      ultimoAcceso: ['Hoy - 14:30']
    });

    this.passwordForm = this.fb.group({
      actual: ['', Validators.required],
      nueva: ['', [Validators.required, Validators.minLength(6)]],
      confirmar: ['', Validators.required]
    });

  }

   ngOnInit(): void {
    this.obtenerusuario();
  }

  obtenerusuario(){
    this.httpService.getUsuarios().subscribe({
      next: (data: any) => {
        console.log('Datos del usuario:', data);

        this.perfilForm.patchValue(data);
      },
      error: (error) => {
        console.error('Error al obtener usuario:', error);
      }
    });
  }

  toggleEdit() {
    if (!this.editMode) {
      this.originalData = { ...this.perfilForm.value };
    } else {
      this.perfilForm.patchValue(this.originalData);
    }
    this.editMode = !this.editMode;
  }

  guardarCambios() {
    if (this.perfilForm.valid) {
      console.log('Datos guardados:', this.perfilForm.value);
      this.editMode = false;
    }
  }

  toggleCambiarPass() {
    this.cambiarPassMode = !this.cambiarPassMode;
  }

  guardarPassword() {
    if (this.passwordForm.valid) {
      const { nueva, confirmar } = this.passwordForm.value;
      if (nueva !== confirmar) {
        alert('Las contraseñas no coinciden');
        return;
      }
      console.log('Contraseña cambiada a:', nueva);
      this.cambiarPassMode = false;
      this.passwordForm.reset();
    }
  }
}
