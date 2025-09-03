import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpServices } from '../../../core/services/http/http.service';
import Swal from 'sweetalert2';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function nuevaDistintaDeActualValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const actual = control.get('actual')?.value;
    const nueva = control.get('nueva')?.value;

    if (actual && nueva && actual === nueva) {
      return { mismaContraseña: true };
    }
    return null;
  };
}

export function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const nueva = control.get('nueva')?.value;
  const confirmar = control.get('confirmar')?.value;

  if (nueva && confirmar && nueva !== confirmar) {
    return { noCoinciden: true };
  }
  return null;
}

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
    }, { validators: [nuevaDistintaDeActualValidator(), passwordsMatchValidator] });
  }

  ngOnInit(): void {
    this.obtenerusuario();
  }

  normalizeString(value: string): string {
    return value
      ? value.trim().replace(/\s+/g, ' ')
      : '';
  }

  formHasChanges(): boolean {
    if (!this.originalData) return false; 
    const current = this.perfilForm.value;
    return (
      this.normalizeString(current.nombre) !== this.normalizeString(this.originalData.nombre) ||
      this.normalizeString(current.email) !== this.normalizeString(this.originalData.email)
    );
  }

  obtenerusuario() {
    this.httpService.getUsuarios().subscribe({
      next: (response: any) => {
        const user = response.data;

        this.originalData = {
          id: user.id,
          nombre: user.nombre,
          email: user.correo, 
          fecha_de_registro: user.fecha_registro
        };

        this.perfilForm.patchValue({
          nombre: user.nombre,
          email: user.correo,
          fecha_de_registro: user.fecha_registro
        });

        this.perfilForm.markAsPristine();
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
      this.perfilForm.markAsPristine(); 
      this.perfilForm.markAsUntouched(); 
    }
    this.editMode = !this.editMode;
  }

  guardarCambios() {
    if (this.perfilForm.valid && this.formHasChanges()) {
      this.editMode = false;

      const datos = {
        nombre: this.normalizeString(this.perfilForm.value.nombre),
        correo: this.normalizeString(this.perfilForm.value.email)
      };

      this.httpService.updateUser({
        id: this.originalData.id,
        nombre: datos.nombre,
        correo: datos.correo
      }).subscribe({
        next: (res: any) => {
          Swal.fire({
            title: 'Usuario Actualizado',
            text: 'Usuario actualizado correctamente',
            icon: 'success',
            timer: 3000,
            showConfirmButton: false,
            timerProgressBar: true
          });

          this.originalData = { ...datos };
          this.perfilForm.patchValue(datos);
          this.perfilForm.markAsPristine();
          this.perfilForm.markAsUntouched();
        },
        error: (err) => {
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
    if (!this.cambiarPassMode) {
      this.passwordForm.reset();
    }
  }

  guardarPassword() {
    if (this.passwordForm.invalid) {
      if (this.passwordForm.errors?.['mismaContraseña']) {
        Swal.fire({
          title: 'Error',
          text: 'La nueva contraseña no puede ser igual a la actual',
          icon: 'error',
          timer: 3000,
          showConfirmButton: false,
          timerProgressBar: true
        });
      }
      return;
    }

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

    this.httpService.updatePassword({ actual, nueva }).subscribe({
      next: () => {
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
