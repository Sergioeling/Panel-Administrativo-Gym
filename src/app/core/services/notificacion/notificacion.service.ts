import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AppSettingsService } from '../../../app-settings.service';
import { BehaviorSubject, Observable, Subject, firstValueFrom } from 'rxjs';
import { takeUntil, tap } from 'rxjs/operators';

export interface Notification {
  id: number;
  titulo: string;
  mensaje: string;
  tipo: string;
  leido: boolean;
  fecha_creacion: string;
  usuario_nombre?: string;
  usuario_correo?: string;
  accion?: string;
}

interface CountResponse {
  status: string;
  message: {
    hay_nuevas?: boolean;
    count: number;
    last_id: number;
    timestamp?: number;
  };
  data?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  private apiUrl = `${AppSettingsService.API_ENDPOINT}`;
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private userId: number | null = null;
  private lastNotificationId: number = 0;
  private destroy$ = new Subject<void>();
  private isPolling = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isInitialized = false;

  notifications$ = this.notificationsSubject.asObservable();
  unreadCount$ = this.unreadCountSubject.asObservable();
  
  constructor(private http: HttpClient) {
    console.log('📱 NotificationService constructor');
  }

  /**
   * Configurar userId e inicializar el servicio
   * IMPORTANTE: Solo llamar UNA VEZ al iniciar sesión
   */
  async setUserId(id: number) {
    console.log('=== 🚀 setUserId llamado ===', { id, isInitialized: this.isInitialized });
    
    // Evitar múltiples inicializaciones
    if (this.isInitialized && this.userId === id) {
      console.log('⚠️ Ya está inicializado, ignorando');
      return;
    }
    
    // Detener todo lo anterior
    this.stopPolling();
    this.isInitialized = false;
    
    // Configurar
    this.userId = id;
    this.lastNotificationId = 0;
    this.reconnectAttempts = 0;
    
    // 1. PRIMERO: Cargar conteo inicial (ESPERAR a que termine)
    await this.loadInitialCountAsync();
    
    // 2. DESPUÉS: Iniciar long polling
    this.isInitialized = true;
    this.startLongPolling();
  }

  /**
   * Carga el conteo inicial de forma asíncrona
   */
  private async loadInitialCountAsync(): Promise<void> {
    if (!this.userId) return;
    
    console.log('⏳ Cargando conteo inicial...');
    
    try {
      const response = await firstValueFrom(
        this.http.get<CountResponse>(`${this.apiUrl}notificaciones-count&id=${this.userId}`)
      );
      
      if (response.status === 'success') {
        const count = response.message.count;
        const lastId = response.message.last_id;
        
        console.log(`✅ Conteo inicial cargado: ${count} notificaciones, last_id: ${lastId}`);
        
        this.unreadCountSubject.next(count);
        this.lastNotificationId = lastId;
      }
    } catch (error) {
      console.error('❌ Error al cargar conteo inicial:', error);
    }
  }

  /**
   * Inicia el long polling
   */
  private startLongPolling() {
    if (!this.userId || this.isPolling) {
      console.log('⚠️ No se puede iniciar long polling:', { 
        userId: this.userId, 
        isPolling: this.isPolling 
      });
      return;
    }
    
    this.isPolling = true;
    console.log('🔄 Long polling iniciado con last_id:', this.lastNotificationId);
    this.longPollCount();
  }

  /**
   * Ejecuta una petición de long polling
   */
  private longPollCount() {
    if (!this.userId || !this.isPolling) {
      console.log('⏹️ Long polling detenido');
      return;
    }

    console.log(`⏳ Long polling esperando cambios... (last_id: ${this.lastNotificationId})`);

    this.http.post<CountResponse>(`${this.apiUrl}notificaciones-wait`, {
      user_id: this.userId,
      last_id: this.lastNotificationId,
      timeout: 25
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.reconnectAttempts = 0;
        
        if (response.status === 'success') {
          const newCount = response.message.count;
          const newLastId = response.message.last_id;
          const oldCount = this.unreadCountSubject.value;
          
          console.log('📨 Respuesta long polling:', {
            hay_nuevas: response.message.hay_nuevas,
            count_actual: oldCount,
            count_nuevo: newCount,
            last_id_actual: this.lastNotificationId,
            last_id_nuevo: newLastId
          });
          
          // Actualizar si hay cambios en el last_id
          if (newLastId > this.lastNotificationId) {
            console.log(`🔔 NUEVAS NOTIFICACIONES: ${newCount} total (antes: ${oldCount})`);
            
            this.unreadCountSubject.next(newCount);
            this.lastNotificationId = newLastId;
          } else {
            console.log('✓ Sin cambios');
          }
        }
        
        // Reiniciar long polling
        if (this.isPolling) {
          setTimeout(() => this.longPollCount(), 100);
        }
      },
      error: (error) => {
        console.error('❌ Error en long polling:', error);
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('🛑 Demasiados errores consecutivos');
          this.stopPolling();
          return;
        }
        
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        console.log(`🔄 Reintentando en ${delay}ms (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        if (this.isPolling) {
          setTimeout(() => this.longPollCount(), delay);
        }
      }
    });
  }

  /**
   * Carga las notificaciones completas
   */
  loadNotifications(): Observable<any> {
    if (!this.userId) {
      console.log('⚠️ No hay userId');
      return new Observable(observer => observer.complete());
    }

    console.log('📥 Cargando notificaciones completas...');

    return new Observable(observer => {
      this.http.get(`${this.apiUrl}notificaciones&id=${this.userId}`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.status === 'success') {
              const notificaciones = response.message.notificaciones;
              const totalNoLeidas = response.message.total_no_leidas;
              
              console.log(`✅ Notificaciones cargadas: ${notificaciones.length} total, ${totalNoLeidas} no leídas`);
              
              this.notificationsSubject.next(notificaciones);
              this.unreadCountSubject.next(totalNoLeidas);
              
              // Actualizar last_id
              if (notificaciones.length > 0) {
                const maxId = Math.max(...notificaciones.map((n: Notification) => n.id));
                if (maxId > this.lastNotificationId) {
                  console.log(`📝 Actualizando last_id: ${this.lastNotificationId} → ${maxId}`);
                  this.lastNotificationId = maxId;
                }
              }
            }
            observer.next(response);
            observer.complete();
          },
          error: (error) => {
            console.error('❌ Error al cargar notificaciones:', error);
            observer.error(error);
          }
        });
    });
  }

  /**
   * Marcar todas como leídas
   */
  markAllAsRead(): Observable<any> {
    if (!this.userId) {
      return new Observable(observer => observer.complete());
    }

    console.log('✔️ Marcando todas como leídas...');

    return new Observable(observer => {
      this.http.post(`${this.apiUrl}notificaciones-marcar-leidas`, {
        user_id: this.userId
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Todas marcadas como leídas');
          this.unreadCountSubject.next(0);
          
          // Actualizar las notificaciones en memoria
          const currentNotifs = this.notificationsSubject.value;
          const updatedNotifs = currentNotifs.map(n => ({ ...n, leido: true }));
          this.notificationsSubject.next(updatedNotifs);
          
          observer.next(response);
          observer.complete();
        },
        error: (error) => {
          console.error('❌ Error al marcar como leídas:', error);
          observer.error(error);
        }
      });
    });
  }

  /**
   * Forzar recarga (útil después de crear usuarios)
   */
  async forceRefresh() {
    console.log('🔄 Forzando recarga...');
    
    if (!this.userId) return;
    
    try {
      const response = await firstValueFrom(
        this.http.get<CountResponse>(`${this.apiUrl}notificaciones-count&id=${this.userId}`)
      );
      
      if (response.status === 'success') {
        console.log('✅ Recarga forzada:', response.message);
        this.unreadCountSubject.next(response.message.count);
        this.lastNotificationId = response.message.last_id;
      }
    } catch (error) {
      console.error('❌ Error en recarga forzada:', error);
    }
  }

  /**
   * Detener el polling
   */
  private stopPolling() {
    if (this.isPolling) {
      console.log('⏹️ Deteniendo long polling');
      this.isPolling = false;
    }
  }

  /**
   * Cleanup
   */
  ngOnDestroy() {
    console.log('🗑️ NotificationService destruido');
    this.stopPolling();
    this.isInitialized = false;
    this.destroy$.next();
    this.destroy$.complete();
  }
}