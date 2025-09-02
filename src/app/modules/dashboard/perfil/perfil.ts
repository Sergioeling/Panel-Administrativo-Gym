import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpServices } from '../../../core/services/http/http.service';
import Swal from 'sweetalert2';

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

  protected httpService = inject(HttpServices);

  constructor(private fb: FormBuilder) {
    this.perfilForm = this.fb.group({
      nombre: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      fecha_de_registro: ['']
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

  obtenerusuario() {
    this.httpService.getUsuarios().subscribe({
      next: (response: any) => {
        //console.log('Datos del usuario:', response);
        const user = response.data; 
        this.originalData = user; 

        this.perfilForm.patchValue({
          nombre: user.nombre,
          email: user.correo,
          fecha_de_registro: user.fecha_registro
        });
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
      this.editMode = false;
      const datos = this.perfilForm.value;

      this.httpService.updateUser({
        id: this.originalData.id,   
        nombre: datos.nombre,
        correo: datos.email
      }).subscribe({
        next: (res: any) => {
          //console.log('Usuario actualizado correctamente:', res);
          Swal.fire({
            title: 'Usuario Actualizado',
            text: 'Usuario actualizado correctamente',
            icon: 'success',
            timer: 3000,
            showConfirmButton: false,
            timerProgressBar: true
          });
        },
        error: (err) => {
          //console.error('Error al actualizar usuario:', err);
           Swal.fire({
            title: 'Error',
            text: err?.error?.message || 'Error al actualizar usuario:',
            icon: 'error',
            timer: 3000,
            showConfirmButton: false,
            timerProgressBar: true
          });
        }
      });
    }
  }


  toggleCambiarPass() {
    this.cambiarPassMode = !this.cambiarPassMode;
  }

  guardarPassword() {
    if (this.passwordForm.valid) {
      const { actual, nueva, confirmar } = this.passwordForm.value;

      if (nueva !== confirmar) {
        Swal.fire({
          title: 'Error',
          text: 'Las contraseñas no coinciden',
          icon: 'error',
          timer: 3000,
          showConfirmButton: false,
          timerProgressBar: true
        });
        return;
      }

      this.httpService.updatePassword({
        actual: actual,
        nueva: nueva
      }).subscribe({
        next: (res: any) => {
          //console.log('Contraseña actualizada correctamente:', res);
          Swal.fire({
            title: 'Contraseña Actualizada',
            text: 'Tu contraseña se cambió exitosamente',
            icon: 'success',
            timer: 3000,
            showConfirmButton: false,
            timerProgressBar: true
          });

          this.cambiarPassMode = false;
          this.passwordForm.reset();
        },
        error: (err) => {
          //console.error('Error al cambiar contraseña:', err);
          Swal.fire({
            title: 'Error',
            text: err?.error?.message || 'No se pudo cambiar la contraseña',
            icon: 'error',
            timer: 3000,
            showConfirmButton: false,
            timerProgressBar: true
          });
        }
      });
    }
  }

}
