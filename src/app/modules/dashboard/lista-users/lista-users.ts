import { Component, inject, OnInit, AfterViewInit, OnDestroy, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef, TrackByFunction } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthServices } from '../../../core/services/auth/auth.service';
import { HttpServices } from '../../../core/services/http/http.service';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Subject, takeUntil } from 'rxjs';
import { AltaUsuarios } from '../../shared/modales/alta-usuarios/alta-usuarios';
import Swal from 'sweetalert2';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

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
  selector: 'app-lista-users',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule
  ],
  templateUrl: './lista-users.html',
  styleUrl: './lista-users.scss',
  changeDetection: ChangeDetectionStrategy.Default
})
export class ListaUsers implements OnInit, AfterViewInit, OnDestroy {
  protected auth = inject(AuthServices);
  protected http = inject(HttpServices);

  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);
  private breakpointObserver = inject(BreakpointObserver);

  loading = false;
  errorMsg: string | null = null;
  search = '';
  isMobile = false;
  isTablet = false;
  mobilePageSize = 6;
  mobileCurrentPage = 0;
  mobileTotalPages = 0;
  mobilePagedData: Usuario[] = [];

  displayedColumns: string[] = [
    'nombre',
    'correo',
    'rol',
    'fecha_registro',
    'acciones'
  ];

  displayedColumnsTablet: string[] = [
    'nombre',
    'correo',
    'rol',
    'acciones'
  ];

  dataSource = new MatTableDataSource<Usuario>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private modalService: NgbModal) { }

  ngOnInit(): void {
    this.setupResponsive();
    this.obtenerUsuarios();
    this.setupDataSourceConfig();
  }

  setupResponsive(): void {
    this.breakpointObserver.observe([
      Breakpoints.XSmall,
      Breakpoints.Small,
      Breakpoints.Medium
    ]).pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.isMobile = this.breakpointObserver.isMatched(['(max-width: 767px)']);
        this.isTablet = this.breakpointObserver.isMatched(['(min-width: 768px) and (max-width: 1023px)']);

        if (this.isMobile) {
          this.updateMobilePagination();
        }

        this.cdr.markForCheck();
      });
  }

  setupDataSourceConfig(): void {
    this.dataSource.filterPredicate = (data: Usuario, filter: string) => {
      const f = (filter ?? '').trim().toLowerCase();
      return (
        (data?.nombre ?? '').toString().toLowerCase().includes(f) ||
        (data?.correo ?? '').toString().toLowerCase().includes(f) ||
        (data?.rol ?? '').toString().toLowerCase().includes(f) ||
        (data?.user_id ?? '').toString().toLowerCase().includes(f)
      );
    };

    this.dataSource.sortingDataAccessor = (item: Usuario, prop: string) => {
      if (prop === 'fecha_registro') {
        return new Date(item?.fecha_registro ?? '').getTime();
      }
      return (item?.[prop as keyof Usuario] ?? '').toString().toLowerCase();
    };
  }

  ngAfterViewInit(): void {
    if (!this.isMobile) {
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  obtenerUsuarios(): void {
    this.loading = true;
    this.errorMsg = null;
    this.cdr.markForCheck();

    this.http.obtenerUsuarios()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp: any) => {
          try {
            if (resp && resp.status === 'success' && resp.data) {
              const usuarios = resp.data
                .filter((usuario: any) => usuario.rol?.toLowerCase() !== 'admin')
                .map((usuario: any) => ({
                  ...usuario,
                  status: usuario.status || '0'
                }));

              this.dataSource.data = usuarios;

              if (this.isMobile) {
                this.updateMobilePagination();
              }
            } else {
              this.errorMsg = 'Formato de respuesta inválido';
            }
          } catch (error) {
            this.errorMsg = 'Error procesando los datos de usuarios';
          } finally {
            this.loading = false;
            this.cdr.markForCheck();
          }
        },
        error: (err) => {
          this.errorMsg = 'Error al cargar usuarios. Intenta nuevamente.';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  applyFilter(value: string): void {
    this.search = value ?? '';
    this.dataSource.filter = this.search.trim().toLowerCase();

    if (!this.isMobile && this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    } else if (this.isMobile) {
      this.mobileCurrentPage = 0;
      this.updateMobilePagination();
    }
    this.cdr.markForCheck();
  }

  clearSearch(): void {
    this.search = '';
    this.dataSource.filter = '';

    if (!this.isMobile && this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    } else if (this.isMobile) {
      this.mobileCurrentPage = 0;
      this.updateMobilePagination();
    }
    this.cdr.markForCheck();
  }

  updateMobilePagination(): void {
    if (!this.isMobile) return;

    const filteredData = this.dataSource.filteredData.length > 0
      ? this.dataSource.filteredData
      : this.dataSource.data;

    this.mobileTotalPages = Math.ceil(filteredData.length / this.mobilePageSize);

    const startIndex = this.mobileCurrentPage * this.mobilePageSize;
    const endIndex = startIndex + this.mobilePageSize;

    this.mobilePagedData = filteredData.slice(startIndex, endIndex);
    this.cdr.markForCheck();
  }

  onMobilePageChange(page: number): void {
    this.mobileCurrentPage = page;
    this.updateMobilePagination();
  }

  previousMobilePage(): void {
    if (this.mobileCurrentPage > 0) {
      this.mobileCurrentPage--;
      this.updateMobilePagination();
    }
  }

  nextMobilePage(): void {
    if (this.mobileCurrentPage < this.mobileTotalPages - 1) {
      this.mobileCurrentPage++;
      this.updateMobilePagination();
    }
  }

  getMobilePageNumbers(): number[] {
    const pages: number[] = [];
    const totalPages = this.mobileTotalPages;
    const current = this.mobileCurrentPage;

    let start = Math.max(0, current - 2);
    let end = Math.min(totalPages - 1, current + 2);

    if (end - start < 4) {
      if (start === 0) {
        end = Math.min(totalPages - 1, start + 4);
      } else if (end === totalPages - 1) {
        start = Math.max(0, end - 4);
      }
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  get filteredData(): Usuario[] {
    return this.dataSource.filteredData.length
      ? this.dataSource.filteredData
      : this.dataSource.data;
  }

  trackById: TrackByFunction<Usuario> = (index: number, item: Usuario): string => {
    return item?.id ?? index.toString();
  };

  retryLoad(): void {
    this.obtenerUsuarios();
  }


  editarUsuario(usuario: Usuario): void {

  }

  toggleUsuarioActivo(usuario: Usuario, activo: boolean): void {
    if (usuario.rol?.toLowerCase() === 'admin') {
      Swal.fire({
        title: 'Acción no permitida',
        text: 'No se puede modificar el estado de un administrador',
        icon: 'warning',
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        toast: true,
        background: '#ffffff',
        color: '#374151',
        iconColor: '#f59e0b',
        customClass: {
          popup: 'swal-toast-warning'
        }
      });
      return;
    }

    const nuevoStatus = activo ? '1' : '0';
    const statusData = {
      status: parseInt(nuevoStatus)
    };

    this.http.actualizarStatusUsuario(parseInt(usuario.id), statusData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const index = this.dataSource.data.findIndex(u => u.id === usuario.id);
          if (index !== -1) {
            this.dataSource.data[index].status = nuevoStatus;
            if (this.isMobile) {
              this.updateMobilePagination();
            }

            this.cdr.markForCheck();
          }

          // 🎉 ENVIAR CORREO SOLO CUANDO SE ACTIVA LA CUENTA (status = 1)
          if (activo && nuevoStatus === '1') {
            this.enviarCorreoActivacion(usuario);
          }

          Swal.fire({
            title: '¡Éxito!',
            text: `Usuario ${usuario.nombre} ${activo ? 'activado' : 'desactivado'} correctamente`,
            icon: 'success',
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            toast: true,
            background: '#ffffff',
            color: '#374151',
            iconColor: activo ? '#10b981' : '#ef4444',
            customClass: {
              popup: 'swal-toast-success'
            }
          });
        },
        error: (err) => {
          this.obtenerUsuarios();
          Swal.fire({
            title: 'Error',
            text: `No se pudo ${activo ? 'activar' : 'desactivar'} el usuario ${usuario.nombre}`,
            icon: 'error',
            position: 'top-end',
            showConfirmButton: false,
            timer: 4000,
            timerProgressBar: true,
            toast: true,
            background: '#ffffff',
            color: '#374151',
            iconColor: '#ef4444',
            customClass: {
              popup: 'swal-toast-error'
            }
          });
        }
      });
  }

  enviarCorreoActivacion(usuario: Usuario): void {
    const subject = '¡Tu cuenta ha sido activada! - Panel Administrativo Gym';
    const message = this.generarHTMLCorreoActivacion(usuario);

    this.http.enviarEmail(usuario.correo, subject, message)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          Swal.fire({
            title: 'Correo enviado',
            text: `Se notificó a ${usuario.nombre} sobre la activación de su cuenta`,
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

  generarHTMLCorreoActivacion(usuario: Usuario): string {
    const fechaActivacion = new Date().toLocaleDateString('es-ES', {
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
        <title>Cuenta Activada - Panel Administrativo Gym</title>
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
                background: linear-gradient(135deg, #F39C12 0%, #e67e22 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 20px;
                box-shadow: 0 8px 20px rgba(243, 156, 18, 0.3);
                position: relative;
                z-index: 2;
            }
            
            .icon-container::after {
                content: '✓';
                font-size: 40px;
                color: #ffffff;
                font-weight: bold;
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
                color: #F39C12;
                font-weight: 700;
                font-size: 26px;
            }
            
            .message-body {
                color: #5a6c7d;
                font-size: 16px;
                line-height: 1.6;
                margin-bottom: 30px;
                text-align: center;
            }
            
            .info-card {
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                border: 2px solid #e2e8f0;
                border-radius: 12px;
                padding: 20px;
                margin: 20px 0;
                text-align: center;
            }
            
            .info-card h3 {
                color: #2C3E50;
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 10px;
            }
            
            .info-card p {
                color: #64748b;
                font-size: 14px;
                margin: 5px 0;
            }
            
            .date-badge {
                display: inline-block;
                background: linear-gradient(135deg, #F39C12 0%, #e67e22 100%);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
                margin: 10px 0;
            }
            
            .features {
                margin: 30px 0;
            }
            
            .feature-item {
                display: flex;
                align-items: center;
                margin: 15px 0;
                padding: 15px;
                background: #f8fafc;
                border-radius: 8px;
                border-left: 4px solid #F39C12;
            }
            
            .feature-icon {
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #2C3E50 0%, #1A252F 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 15px;
                font-size: 18px;
                color: white;
            }
            
            .feature-text {
                flex: 1;
            }
            
            .feature-text h4 {
                color: #2C3E50;
                font-size: 16px;
                font-weight: 600;
                margin-bottom: 5px;
            }
            
            .feature-text p {
                color: #64748b;
                font-size: 14px;
            }
            
            .cta-section {
                text-align: center;
                margin: 30px 0;
                padding: 30px;
                background: linear-gradient(135deg, rgba(44, 62, 80, 0.05) 0%, rgba(243, 156, 18, 0.05) 100%);
                border-radius: 12px;
                border: 2px dashed #F39C12;
            }
            
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #2C3E50 0%, #1A252F 100%);
                color: white;
                padding: 15px 30px;
                border-radius: 8px;
                text-decoration: none;
                font-weight: 600;
                font-size: 16px;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(44, 62, 80, 0.3);
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
                color: #F39C12;
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
                
                .feature-item {
                    flex-direction: column;
                    text-align: center;
                }
                
                .feature-icon {
                    margin-right: 0;
                    margin-bottom: 10px;
                }
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <div class="icon-container"></div>
                <h1>🎉 ¡Cuenta Activada!</h1>
                <p>Panel Administrativo Gym</p>
            </div>
            
            <div class="content">
                <div class="welcome-message">
                    <h2>¡Hola <span class="user-name">${usuario.nombre}</span>!</h2>
                </div>
                
                <div class="message-body">
                    <p>Nos complace informarte que tu cuenta ha sido <strong>activada exitosamente</strong> en nuestro Panel Administrativo del Gimnasio.</p>
                    <p>Ya puedes acceder a todas las funcionalidades del sistema según tu rol asignado.</p>
                </div>
                
                <div class="info-card">
                    <h3>📋 Detalles de tu cuenta</h3>
                    <p><strong>Usuario:</strong> ${usuario.nombre}</p>
                    <p><strong>Email:</strong> ${usuario.correo}</p>
                    <p><strong>Rol:</strong> ${usuario.rol || 'Usuario'}</p>
                    <p><strong>ID de Usuario:</strong> ${usuario.user_id}</p>
                    <div class="date-badge">Activada el ${fechaActivacion}</div>
                </div>
                
                <div class="features">
                    <h3 style="color: #2C3E50; text-align: center; margin-bottom: 20px;">🚀 Lo que puedes hacer ahora:</h3>
                    
                    <div class="feature-item">
                        <div class="feature-icon">👤</div>
                        <div class="feature-text">
                            <h4>Gestión de Perfil</h4>
                            <p>Actualiza tu información personal y preferencias</p>
                        </div>
                    </div>
                    
                    <div class="feature-item">
                        <div class="feature-icon">🥗</div>
                        <div class="feature-text">
                            <h4>Consulta de Alimentos</h4>
                            <p>Accede a la base de datos nutricional completa</p>
                        </div>
                    </div>
                    
                    <div class="feature-item">
                        <div class="feature-icon">🍽️</div>
                        <div class="feature-text">
                            <h4>Platillos y Recetas</h4>
                            <p>Explora nuestro catálogo de platillos saludables</p>
                        </div>
                    </div>
                </div>
                
                <div class="cta-section">
                    <h3 style="color: #2C3E50; margin-bottom: 15px;">🎯 ¡Comienza ahora!</h3>
                    <p style="color: #64748b; margin-bottom: 20px;">Accede al panel administrativo y comienza a disfrutar de todas las funcionalidades</p>
                    <a href="https://dtinutricion.arvispace.com/" class="cta-button">Acceder al Panel</a>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding: 20px; background: rgba(243, 156, 18, 0.1); border-radius: 8px;">
                    <p style="color: #2C3E50; font-weight: 600; margin-bottom: 5px;">¿Necesitas ayuda?</p>
                    <p style="color: #64748b; font-size: 14px;">Contacta a nuestro equipo de soporte para cualquier consulta</p>
                </div>
            </div>
            
            <div class="footer">
                <p class="company-name">Panel Administrativo Gym</p>
                <p>Gracias por ser parte de nuestra <span class="accent">comunidad saludable</span></p>
                <p>Este correo fue enviado automáticamente el ${fechaActivacion}</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  getRolBadgeClass(rol: string): string {
    switch (rol?.toLowerCase()) {
      case 'admin':
        return 'role-badge admin';
      case 'nutricionista':
        return 'role-badge nutricionista';
      case 'recepcionista':
        return 'role-badge recepcionista';
      case 'usuario':
        return 'role-badge usuario';
      default:
        return 'role-badge default';
    }
  }

  getRolIcon(rol: string): string {
    switch (rol?.toLowerCase()) {
      case 'admin':
        return 'bi-shield-check';
      case 'nutricionista':
        return 'bi-heart-pulse';
      case 'recepcionista':
        return 'bi-person-workspace';
      case 'usuario':
        return 'bi-person';
      default:
        return 'bi-person-circle';
    }
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '—';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  get currentDisplayedColumns(): string[] {
    if (this.isTablet) {
      return this.displayedColumnsTablet;
    }
    return this.displayedColumns;
  }


  get totalUsuarios(): number {
    return this.dataSource.data.length;
  }

  get usuariosActivos(): number {
    return this.dataSource.data.filter(u =>
      u.status === '1' && u.rol?.toLowerCase() !== 'admin'
    ).length;
  }

  get totalNutricionistas(): number {
    return this.dataSource.data.filter(u => u.rol?.toLowerCase() === 'nutricionista').length;
  }

  get usuariosPorRol(): { [key: string]: number } {
    return this.dataSource.data.reduce((acc, usuario) => {
      const rol = usuario.rol || 'Sin rol';
      acc[rol] = (acc[rol] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
  }

  isUsuarioActivo(usuario: Usuario): boolean {
    return usuario.status === '1';
  }

  openModalAltaUsuarios(item?: any, edit?: boolean): void {
    const modalRef = this.modalService.open(AltaUsuarios, {
      backdrop: 'static',
      size: 'lg',
      scrollable: true
    });

    if (item && edit) {
      modalRef.componentInstance.alimentoData = item;
      modalRef.componentInstance.isEdit = true;
    } else {
      modalRef.componentInstance.alimentoData = null;
      modalRef.componentInstance.isEdit = false;
    }

    modalRef.result.then(
      (result: any) => {
        if (result?.success) {
          const action = result.isEdit ? 'actualizado' : 'creado';
          Swal.fire({
            icon: 'success',
            title: `Alimento ${action}`,
            text: 'Se guardó correctamente.',
            confirmButtonText: 'Aceptar'
          }).then(() => {
            this.obtenerUsuarios();
          });
        }
      },
      () => { }
    );
  }


}
