import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthServices } from '../../../core/services/auth/auth.service';
import { HttpServices } from '../../../core/services/http/http.service';
import { NotificationService } from '../../../core/services/notificacion/notificacion.service';
import { Subject, takeUntil } from 'rxjs';

interface DashboardStats {
  totalUsuarios: number;
  usuariosActivos: number;
  nutricionistas: number;
  administradores: number;
  alimentosRegistrados: number;
  sesionesHoy: number;
  nuevosUsuarios: number;
  actividad: number;
}

interface QuickAction {
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  permission: string[];
}

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss'
})
export class Inicio implements OnInit, OnDestroy {
  private auth = inject(AuthServices);
  private router = inject(Router);
  private http = inject(HttpServices);
  private cdr = inject(ChangeDetectorRef);
  private noti = inject(NotificationService);
  private destroy$ = new Subject<void>();

  protected userName: string = '';
  protected userRole: string = '';
  protected loading = true;
  protected currentTime = new Date();
  protected timeInterval: any;
  protected userId: number = 0;

  protected stats: DashboardStats = {
    totalUsuarios: 0,
    usuariosActivos: 0,
    nutricionistas: 0,
    administradores: 0,
    alimentosRegistrados: 0,
    sesionesHoy: 0,
    nuevosUsuarios: 0,
    actividad: 0
  };

  protected quickActions: QuickAction[] = [];

  constructor() { }

  async ngOnInit() {
  await this.loadUserData();
  this.initializeQuickActions();
  this.loadDashboardStats();
  this.startTimeUpdate();
  
  setTimeout(() => {
    if (this.loading) {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }, 5000);
}

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  }

  private async loadUserData() {
  try {
    this.userName = this.auth.getUserName() || 'Usuario';
    this.userRole = this.auth.getUserRole() || 'USUARIO';
    this.userId = this.auth.getIdUser();
    
    if(this.userId) {
      console.log("USERID: ", this.userId);
      
      // ✅ ESPERAR a que se inicialice completamente
      await this.noti.setUserId(this.userId);
      console.log('✅ Servicio de notificaciones inicializado');
      
      // Suscribirse a las notificaciones para debugging
      this.noti.notifications$
        .pipe(takeUntil(this.destroy$))
        .subscribe(notifications => {
          console.log('Notificaciones recibidas:', notifications);
        });
        
      this.noti.unreadCount$
        .pipe(takeUntil(this.destroy$))
        .subscribe(count => {
          console.log('Total no leídas:', count);
        });
    }
  } catch (error) {
    console.error('Error loading user data:', error);
    this.userName = 'Usuario';
    this.userRole = 'USUARIO';
  }
}

  private initializeQuickActions() {
    const allActions: QuickAction[] = [
      {
        title: 'Gestionar Usuarios',
        description: 'Ver y administrar todos los usuarios del sistema',
        icon: 'bi-people',
        route: 'miembros',
        color: 'from-blue-500 to-blue-600',
        permission: ['ADMIN']
      },
      {
        title: 'Lista de Alimentos',
        description: 'Administrar base de datos nutricional completa',
        icon: 'bi-egg-fried',
        route: 'alimentos',
        color: 'from-green-500 to-green-600',
        permission: ['ADMIN']
      },
      
      {
        title: 'Mis Alimentos',
        description: 'Ver alimentos que he creado como nutricionista',
        icon: 'bi-egg-fried',
        route: 'platillos-nutricionista',
        color: 'from-green-500 to-green-600',
        permission: ['NUTRICIONISTA']
      },
      {
        title: 'Mi Perfil',
        description: 'Actualizar información personal y configuración',
        icon: 'bi-person-gear',
        route: 'perfil',
        color: 'from-purple-500 to-purple-600',
        permission: ['ADMIN', 'NUTRICIONISTA', 'USUARIO']
      },
      {
        title: 'Gestión de Dietas',
        description: 'Crear y gestionar planes de alimentación',
        icon: 'bi-journal-medical',
        route: 'dietas-nutricionista',
        color: 'from-teal-500 to-teal-600',
        permission: ['NUTRICIONISTA']
      },
      {
        title: 'Mi Plan Nutricional',
        description: 'Ver mi plan de alimentación personalizado',
        icon: 'bi-heart',
        route: 'mi-plan',
        color: 'from-pink-500 to-pink-600',
        permission: ['USUARIO']
      },
      /*{
        title: 'Configuración',
        description: 'Configuración del sistema y preferencias',
        icon: 'bi-gear',
        route: 'configuracion',
        color: 'from-gray-500 to-gray-600',
        permission: ['ADMIN']
      }*/
    ];

    this.quickActions = allActions.filter(action => 
      this.hasPermission(action.permission)
    );
  }

  loadDashboardStats() {
    this.loading = true;
    this.cdr.detectChanges();
    
    if (this.userRole !== 'ADMIN') {
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.http.obtenerUsuarios()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp: any) => {
          if (resp?.status === 'success' && resp?.data && Array.isArray(resp.data)) {
            const usuarios = resp.data;
            
            this.stats.totalUsuarios = usuarios.length;
            this.stats.usuariosActivos = usuarios.filter((u: any) => u.status === '1').length;
            this.stats.nutricionistas = usuarios.filter((u: any) => u.rol?.toLowerCase() === 'nutricionista').length;
            this.stats.administradores = usuarios.filter((u: any) => u.rol?.toLowerCase() === 'admin').length;
            
            this.stats.alimentosRegistrados = 150;
            this.stats.sesionesHoy = 24;
            this.stats.nuevosUsuarios = 8;
            this.stats.actividad = 85;
          } else {
            this.setDefaultStats();
          }
          
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.setDefaultStats();
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  private setDefaultStats() {
    this.stats = {
      totalUsuarios: 248,
      usuariosActivos: 185,
      nutricionistas: 12,
      administradores: 3,
      alimentosRegistrados: 150,
      sesionesHoy: 24,
      nuevosUsuarios: 8,
      actividad: 85
    };
  }

  private startTimeUpdate() {
    this.currentTime = new Date();
    this.timeInterval = setInterval(() => {
      this.currentTime = new Date();
      this.cdr.detectChanges();
    }, 1000);
  }

  /* private getNotifications(userId: number) { 
  this.noti.getNotificationsFromApi(userId).subscribe({
    next: (response) => {
      console.log('Respuesta de notificaciones:', response);
      
    },
    error: (err) => {
      console.error('Error al traer notificaciones:', err);
    }
  });
} */

  protected getGreeting(): string {
    const hour = this.currentTime.getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }

  protected getFormattedTime(): string {
    return this.currentTime.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  protected getFormattedDate(): string {
    return this.currentTime.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  protected navigateTo(route: string) {
    this.router.navigate([`/dashboard/${route}`]);
  }

  protected hasPermission(permissions: string[]): boolean {
    return permissions.includes(this.userRole);
  }

  protected getActivityPercentage(): number {
    return Math.min(100, this.stats.actividad);
  }

  protected trackByRoute(index: number, action: QuickAction): string {
    return action.route;
  }
}
