import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AppSettingsService } from '../../../app-settings.service';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';

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

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = `${AppSettingsService.API_ENDPOINT}`;
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private userId: number | null = null;
  private pollingSubscription?: Subscription;

  notifications$ = this.notificationsSubject.asObservable();
  unreadCount$ = this.unreadCountSubject.asObservable();
  
  constructor(private http: HttpClient) {}

  setUserId(id: number) {
    this.userId = id;
    
    // Detener polling anterior si existe
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
    
    // Cargar notificaciones inmediatamente
    this.loadNotifications();
    
    // Iniciar polling cada 30 segundos
    this.startPolling(30000);
  }

  private startPolling(intervalMs: number) {
    if (!this.userId) return;
    
    this.pollingSubscription = interval(intervalMs)
      .pipe(
        switchMap(() => this.getNotificationsFromApi(this.userId!))
      )
      .subscribe();
  }
  
  // Método público para cargar notificaciones manualmente
  loadNotifications() {
    if (this.userId) {
      this.getNotificationsFromApi(this.userId).subscribe();
    }
  }
  
  private getNotificationsFromApi(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}notificaciones&id=${id}`).pipe(
      tap((response: any) => {
        console.log('Respuesta de notificaciones:', response);
        if (response.status === 'success') {
          this.notificationsSubject.next(response.message.notificaciones);
          this.unreadCountSubject.next(response.message.total_no_leidas);
          console.log('Total no leídas:', response.message.total_no_leidas);
        }
      })
    );
  }
  
  markAsRead(notificationId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/notificaciones/leer`, {
      notification_id: notificationId
    }).pipe(
      tap(() => this.loadNotifications()) // Recargar después de marcar como leída
    );
  }
  
  markAllAsRead(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/notificaciones/leer-todas`, {
      user_id: id
    }).pipe(
      tap(() => this.loadNotifications()) // Recargar después de marcar todas
    );
  }
  
  // Limpiar al destruir el servicio
  ngOnDestroy() {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }
}