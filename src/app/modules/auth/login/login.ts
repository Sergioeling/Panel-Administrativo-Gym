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
import { RegistrationComponent } from '../../auth/registration/registration';
import { finalize } from 'rxjs/operators';
import { ChangeDetectorRef } from '@angular/core';
import { HttpServices } from '../../../core/services/http/http.service';

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
  private http = inject(HttpServices);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  modalService = inject(NgbModal);
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

      this.authService.login(credenciales).pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      ).subscribe({
        next: (response) => {
          console.log("RESPONSE: ", response);
          
          if (response.data?.inactive === true) {
            const documentos = response.data.documentos || [];
            const documentosRechazados = documentos.filter((doc: any) => doc.estado == 0);
            
            if (documentosRechazados.length > 0) {
              this.mostrarAlertaDocumentosRechazados(documentosRechazados);
            } else if(response.data.status == 2) {
              this.mostrarAlertaRevision(response.message);
            } else {
              this.mostrarAlertaRechazo(response.message)
            }
            return;
          }
          
          if (response.data?.token) {
            this.activeModal.close('success');
            setTimeout(() => {
              const userRole = this.authService.getUserRole();
              if (userRole) {
                this.router.navigate(['/dashboard']);
                window.location.reload();
              }
            }, 2100); 
          }
        },
        error: (error: any) => {
          console.error('Error en login:', error);
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  mostrarAlertaDocumentosRechazados(documentosRechazados: any[]) {
    Swal.fire({
      title: 'Detalle en documentación',
      html: `
        <br>
        <small style="color: #e74c3c; font-weight: 600;">
          Hay un detalle con los siguientes documentos:
        </small>
        <ul class="lista-docs" style="text-align: left; padding-left: 20px; margin: 15px auto; max-width: 300px;">
          ${this.generateDocsItem(documentosRechazados)}
        </ul>
        <br>
        <small style="color: #7f8c8d;">
          Por favor, selecciona los archivos corregidos.
        </small>
        <br><br>
        <button id="btnEnviarDocs" 
                style="color: #ffffff; background-color: green; margin-top: 10px; border-radius:5px; padding: 8px 20px; cursor: pointer;">
          Enviar documentos
        </button>
      `,
      icon: 'warning',
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: 'Más tarde',
      cancelButtonColor: '#d33',
      didOpen: () => {
        let documentosSeleccionados: {tipo: string, docId: string, userId: string, file: File}[] = [];
        
        const inputs = document.querySelectorAll('.btn-resubir');
        
        inputs.forEach(input => {
          input.addEventListener('change', (event: any) => {
            const target = event.target as HTMLInputElement;
            const tipo = target.getAttribute('data-tipo') || '';
            const userId = target.getAttribute('data-userId') || '';
            const docId = target.getAttribute('data-docId') || '';
            const file = target.files?.[0];
            
            if (file) {
              const extension = file.name.split('.').pop()?.toLowerCase();
              const extensionesPermitidas = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
              
              if (!extension || !extensionesPermitidas.includes(extension)) {
                Swal.fire({
                  icon: 'error',
                  title: 'Formato no válido',
                  text: `El archivo ${file.name} no tiene un formato permitido. Formatos: ${extensionesPermitidas.join(', ')}`
                });
                target.value = ''; 
                return;
              }
              
              // Verificar tamaño (5MB máximo)
              if (file.size > 5 * 1024 * 1024) {
                Swal.fire({
                  icon: 'error',
                  title: 'Archivo muy grande',
                  text: `El archivo ${file.name} excede el tamaño máximo de 5MB`
                });
                target.value = '';
                return;
              }
              
              const indexExistente = documentosSeleccionados.findIndex(d => d.tipo === tipo);
              
              if (indexExistente >= 0) {
                documentosSeleccionados[indexExistente] = { tipo, docId, userId, file };
              } else {
                documentosSeleccionados.push({ tipo, docId, userId, file });
              }
              
              target.style.border = '2px solid green';
              
              console.log(`Documento ${tipo} seleccionado:`, file.name);
            }
          });
        });
        
        const btn = document.getElementById('btnEnviarDocs');
        if (btn) {
          btn.addEventListener('click', () => {
            if (documentosSeleccionados.length === 0) {
              Swal.fire({
                icon: 'warning',
                title: 'Sin archivos',
                text: 'Por favor, selecciona al menos un archivo'
              });
              return;
            }
            
            const formData = new FormData();
            
            // Agregar documentos al FormData
            documentosSeleccionados.forEach((doc, index) => {
              formData.append(`documentos[${index}][docId]`, doc.docId);
              formData.append(`documentos[${index}][userId]`, doc.userId);
              formData.append(`documentos[${index}][tipo]`, doc.tipo);
              formData.append(`documentos[${index}][file]`, doc.file, doc.file.name);
            });
            
            // Depurar lo que se envía
            console.log('Enviando FormData con:', documentosSeleccionados.length, 'documentos');
            for (let pair of (formData as any).entries()) {
              console.log(pair[0], pair[1]);
            }
            
            // Mostrar loading
            Swal.fire({
              title: 'Subiendo documentos...',
              text: 'Por favor espera',
              allowOutsideClick: false,
              didOpen: () => {
                Swal.showLoading();
              }
            });
            
            // Enviar al backend
            this.http.resubirDocumento(formData).subscribe({
              next: (res: any) => {
                console.log('Respuesta del servidor:', res);
                
                if (res.status === 'success') {
                  Swal.fire({
                    icon: 'success',
                    title: '¡Éxito!',
                    text: res.message || 'Documentos subidos correctamente',
                    confirmButtonText: 'Aceptar'
                  }).then(() => {
                    this.activeModal.close('documentosActualizados');
                  });
                } else {
                  Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: res.message || 'Error al subir documentos'
                  });
                }
              },
              error: (err) => {
                console.error('Error en la petición:', err);
                Swal.fire({
                  icon: 'error',
                  title: 'Error de conexión',
                  text: 'No se pudo conectar con el servidor. Intenta de nuevo.'
                });
              }
            });
          });
        }
      }
    }).then((result) => {
      if (result.dismiss === Swal.DismissReason.cancel) {
        this.activeModal.close('inactive');
      }
    });
  }

  mostrarAlertaRevision(mensaje: string) {
    Swal.fire({
      title: 'Cuenta en revisión',
      html: `
        <p>${mensaje}</p>
        <br>
        <small>¿Por qué hacemos esto? Puedes revisar tu correo para mayor información.</small>
      `,
      icon: 'info',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#3085d6'
    }).then(() => {
      this.activeModal.close('inactive');
    });
  }

  mostrarAlertaRechazo(mensaje: string) {
    Swal.fire({
      title: 'Cuenta rechazada',
      html: `
        <p>${mensaje}</p>
        <br>
        <small>revisa tu correo para mayor información.</small>
      `,
      icon: 'info',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#3085d6'
    }).then(() => {
      this.activeModal.close('inactive');
    });
  }

  generateDocsItem(docs: any[]): string {
    if (!docs || docs.length === 0) {
      return `<li>No hay documentos rechazados</li>`;
    }
    
    const nombresDocumentos: { [key: string]: string } = {
      'titulo': 'Título Profesional',
      'ine': 'INE',
      'domicilio': 'Comprobante de Domicilio'
    };
    
    return docs.map(doc => {
      const nombreDoc = nombresDocumentos[doc.tipo_documento] || doc.tipo_documento;
      return `
        <li style="margin: 15px 0; color: #e74c3c;">
          <strong>${nombreDoc}</strong><br>
          <small>Motivo: ${doc.comentarios || 'Sin comentarios'}</small>
          <br><br>
          <input type="file" 
                 class="btn-resubir" 
                 data-tipo="${doc.tipo_documento}" 
                 data-docId="${doc.id}"
                 data-userId="${doc.usuario_id}"
                 accept=".pdf,.jpg,.jpeg,.png,.webp"
                 style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        </li>`;
    }).join('');
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

  openRegister() {
    this.activeModal.close();
    this.modalService.open(RegistrationComponent, {
      backdrop: 'static',
      size: 'lg'
    });
  }
}