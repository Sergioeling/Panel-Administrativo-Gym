import { Component, inject, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { HttpServices } from '../../../core/services/http/http.service';
import { Login } from '../../auth/login/login';
import Swal from 'sweetalert2';
import { Router } from '@angular/router'; //----
import { AuthServices } from '../../../core/services/auth/auth.service';//---
import { Subject, takeUntil } from 'rxjs';



interface Usuario {
  id: string;
  user_id: string;
  nombre: string;
  correo: string;
  rol: string;
  fecha_registro: string;
  status: string;
}

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
  private destroy$ = new Subject<void>();


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

        console.log("RES: ", res);
        
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

        this.enviarCorreoRegistro(res.data);
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


enviarCorreoRegistro(usuario: any): void {
    const subject = 'Tu cuenta esta en revision! - Panel Administrativo Gym';
    const message = this.generarHTMLCorreoRegistro(usuario);

    this.http.enviarEmail(usuario.correo, subject, message)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          Swal.fire({
            title: 'Correo enviado',
            text: `${usuario.nombre} verifica tu correo`,
            icon: 'info',
            position: 'top-end',
            showConfirmButton: false,
            timer: 2500,
            timerProgressBar: true,
            toast: true,
            background: '#ffffff',
            color: '#374151',
            iconColor: '#3b82f6',
            customClass: {
              popup: 'swal-toast-info'
            }
          });
        },
        error: () => {
          Swal.fire({
            title: '⚠️ Correo no enviado',
            text: 'No se pudo enviar la notificación por correo',
            icon: 'warning',
            position: 'top-end',
            showConfirmButton: false,
            timer: 2500,
            timerProgressBar: true,
            toast: true,
            background: '#ffffff',
            color: '#374151',
            iconColor: '#f59e0b',
            customClass: {
              popup: 'swal-toast-warning'
            }
          });
        }
      });
  }


generarHTMLCorreoRegistro(usuario: Usuario): string {
    const fechaRegistro = new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cuenta en Revisión - DTI Nutrición</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                margin: 0;
                padding: 20px;
            }
            
            .email-container {
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 10px 30px rgba(44, 62, 80, 0.15);
            }
            
            .header {
                background: linear-gradient(135deg, #2C3E50 0%, #1A252F 100%);
                padding: 30px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }
            
            .header::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(243, 156, 18, 0.1) 0%, transparent 70%);
                animation: pulse 4s ease-in-out infinite;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 0.3; }
                50% { opacity: 0.7; }
            }
            
            .header h1 {
                color: #ffffff;
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 8px;
                position: relative;
                z-index: 2;
            }
            
            .header p {
                color: rgba(255, 255, 255, 0.9);
                font-size: 16px;
                position: relative;
                z-index: 2;
            }
            
            .icon-container {
                display: inline-block;
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 20px;
                box-shadow: 0 8px 20px rgba(52, 152, 219, 0.3);
                position: relative;
                z-index: 2;
            }
            
            .icon-container::after {
                content: '🔍';
                font-size: 40px;
            }
            
            .content {
                padding: 40px 30px;
            }
            
            .welcome-message {
                text-align: center;
                margin-bottom: 30px;
            }
            
            .welcome-message h2 {
                color: #2C3E50;
                font-size: 24px;
                font-weight: 600;
                margin-bottom: 10px;
            }
            
            .user-name {
                color: #3498db;
                font-weight: 700;
                font-size: 26px;
            }
            
            .message-body {
                color: #5a6c7d;
                font-size: 16px;
                line-height: 1.8;
                margin-bottom: 30px;
            }
            
            .info-card {
                background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
                border: 2px solid #90caf9;
                border-radius: 12px;
                padding: 25px;
                margin: 25px 0;
                text-align: center;
            }
            
            .info-card h3 {
                color: #2C3E50;
                font-size: 20px;
                font-weight: 600;
                margin-bottom: 15px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
            }
            
            .info-card p {
                color: #34495e;
                font-size: 15px;
                margin: 10px 0;
                line-height: 1.6;
            }
            
            .status-badge {
                display: inline-block;
                background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
                color: white;
                padding: 10px 20px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
                margin: 15px 0;
            }
            
            .info-box {
                background: #fff9e6;
                border-left: 4px solid #f39c12;
                padding: 20px;
                margin: 25px 0;
                border-radius: 8px;
            }
            
            .info-box h4 {
                color: #2C3E50;
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 15px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .info-box p {
                color: #5a6c7d;
                font-size: 15px;
                line-height: 1.7;
                margin-bottom: 10px;
            }
            
            .verification-steps {
                margin: 30px 0;
            }
            
            .step-item {
                display: flex;
                align-items: flex-start;
                margin: 20px 0;
                padding: 20px;
                background: #f8fafc;
                border-radius: 12px;
                border-left: 4px solid #3498db;
            }
            
            .step-number {
                width: 35px;
                height: 35px;
                background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 15px;
                font-size: 16px;
                color: white;
                font-weight: 700;
                flex-shrink: 0;
            }
            
            .step-content {
                flex: 1;
            }
            
            .step-content h4 {
                color: #2C3E50;
                font-size: 16px;
                font-weight: 600;
                margin-bottom: 8px;
            }
            
            .step-content p {
                color: #64748b;
                font-size: 14px;
                line-height: 1.6;
            }
            
            .commitment-section {
                background: linear-gradient(135deg, rgba(46, 204, 113, 0.1) 0%, rgba(39, 174, 96, 0.1) 100%);
                border: 2px solid #2ecc71;
                border-radius: 12px;
                padding: 25px;
                margin: 25px 0;
                text-align: center;
            }
            
            .commitment-section h3 {
                color: #27ae60;
                font-size: 20px;
                font-weight: 700;
                margin-bottom: 15px;
            }
            
            .commitment-section p {
                color: #2C3E50;
                font-size: 15px;
                line-height: 1.7;
            }
            
            .highlight {
                color: #27ae60;
                font-weight: 600;
            }
            
            .contact-section {
                text-align: center;
                margin: 30px 0;
                padding: 25px;
                background: rgba(243, 156, 18, 0.1);
                border-radius: 12px;
                border: 2px dashed #f39c12;
            }
            
            .contact-section h4 {
                color: #2C3E50;
                font-weight: 600;
                margin-bottom: 10px;
                font-size: 18px;
            }
            
            .contact-section p {
                color: #64748b;
                font-size: 14px;
                line-height: 1.6;
            }
            
            .footer {
                background: #f8fafc;
                padding: 25px 30px;
                text-align: center;
                border-top: 1px solid #e2e8f0;
            }
            
            .footer p {
                color: #64748b;
                font-size: 14px;
                margin: 5px 0;
            }
            
            .footer .company-name {
                color: #2C3E50;
                font-weight: 600;
            }
            
            .footer .accent {
                color: #3498db;
                font-weight: 600;
            }
            
            @media (max-width: 600px) {
                .email-container {
                    margin: 10px;
                    border-radius: 12px;
                }
                
                .header {
                    padding: 20px;
                }
                
                .header h1 {
                    font-size: 24px;
                }
                
                .content {
                    padding: 25px 20px;
                }
                
                .welcome-message h2 {
                    font-size: 20px;
                }
                
                .user-name {
                    font-size: 22px;
                }
                
                .step-item {
                    flex-direction: column;
                }
                
                .step-number {
                    margin-bottom: 10px;
                }
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <div class="icon-container"></div>
                <h1>✅ ¡Registro Exitoso!</h1>
                <p>DTI Nutrición - Plataforma de Nutricionistas</p>
            </div>
            
            <div class="content">
                <div class="welcome-message">
                    <h2>¡Hola <span class="user-name">${usuario.nombre}</span>!</h2>
                </div>
                
                <div class="message-body">
                    <p><strong>Tu cuenta ha sido creada correctamente.</strong> Estamos emocionados de que formes parte de nuestra comunidad de profesionales de la nutrición.</p>
                    <p>Nuestros administradores revisarán tu cuenta en breve para validar tus datos y credenciales profesionales.</p>
                </div>
                
                <div class="info-card">
                    <h3>🔍 Estado actual de tu cuenta</h3>
                    <div class="status-badge">EN REVISIÓN</div>
                    <p>En estos momentos tu cuenta está siendo validada por nuestro equipo.</p>
                    <p><strong>No podrás iniciar sesión hasta que la revisión esté completa.</strong></p>
                    <p style="color: #27ae60; font-weight: 600; margin-top: 15px;">Este proceso tomará solo unos minutos. ⏱️</p>
                </div>
                
                <div class="info-box">
                    <h4>💡 ¿Por qué hacemos esto?</h4>
                    <p>En DTI Nutrición estamos <strong>comprometidos con la excelencia y la confianza</strong>. Validamos cada cuenta para:</p>
                    <ul style="margin: 15px 0; padding-left: 20px; color: #5a6c7d;">
                        <li style="margin: 8px 0;">Garantizar un servicio confiable a nuestros usuarios</li>
                        <li style="margin: 8px 0;">Proteger a la comunidad de personas no autorizadas</li>
                        <li style="margin: 8px 0;">Asegurar que todos los nutricionistas sean profesionales certificados</li>
                        <li style="margin: 8px 0;">Evitar que alguien se haga pasar por quien no es</li>
                    </ul>
                </div>
                
                <div class="commitment-section">
                    <h3>🛡️ Nuestro Compromiso</h3>
                    <p>Queremos garantizar que nuestra <span class="highlight">comunidad sea profesional</span> y que todos nuestros usuarios reciban asesoría de <span class="highlight">nutricionistas certificados y calificados</span>.</p>
                    <p style="margin-top: 15px;">Tu seguridad y la de nuestros usuarios es nuestra prioridad.</p>
                </div>
                
                <div class="verification-steps">
                    <h3 style="color: #2C3E50; text-align: center; margin-bottom: 25px;">📋 Proceso de Verificación</h3>
                    
                    <div class="step-item">
                        <div class="step-number">1</div>
                        <div class="step-content">
                            <h4>Verificación de Documentos</h4>
                            <p>Revisaremos tu título profesional, INE y comprobante de domicilio</p>
                        </div>
                    </div>
                    
                    <div class="step-item">
                        <div class="step-number">2</div>
                        <div class="step-content">
                            <h4>Validación de Credenciales</h4>
                            <p>Corroboraremos que tus datos correspondan con un profesional certificado</p>
                        </div>
                    </div>
                    
                    <div class="step-item">
                        <div class="step-number">3</div>
                        <div class="step-content">
                            <h4>Activación de Cuenta</h4>
                            <p>Una vez aprobada, recibirás un correo de confirmación y podrás acceder</p>
                        </div>
                    </div>
                </div>
                
                <div class="contact-section">
                    <h4>📧 ¿Tienes preguntas?</h4>
                    <p>Si necesitas ayuda o tienes alguna duda sobre el proceso de verificación, no dudes en contactarnos.</p>
                    <p style="margin-top: 10px;"><strong>Te notificaremos por correo cuando tu cuenta esté lista.</strong></p>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding: 20px; background: rgba(52, 152, 219, 0.1); border-radius: 8px;">
                    <p style="color: #2C3E50; font-weight: 600; font-size: 16px;">Gracias por tu paciencia 🙏</p>
                    <p style="color: #64748b; font-size: 14px; margin-top: 10px;">Pronto formarás parte de nuestra comunidad profesional</p>
                </div>
            </div>
            
            <div class="footer">
                <p class="company-name">DTI Nutrición</p>
                <p>Conectando profesionales de la nutrición con personas que buscan una <span class="accent">vida más saludable</span></p>
                <p>Este correo fue enviado automáticamente el ${fechaRegistro}</p>
                <p style="margin-top: 15px; font-size: 12px;">© ${new Date().getFullYear()} DTI Nutrición. Todos los derechos reservados.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

}