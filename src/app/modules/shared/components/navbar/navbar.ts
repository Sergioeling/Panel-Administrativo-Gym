import { Component, EventEmitter, Input, Output, inject, OnInit, HostListener, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { MatIconButton } from "@angular/material/button";
import { AuthServices } from '../../../../core/services/auth/auth.service';
import { NotificationService, Notification } from '../../../../core/services/notificacion/notificacion.service';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, MatIconButton, AsyncPipe],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class Navbar implements OnInit, OnDestroy {
  private auth = inject(AuthServices);
  private noti = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();
  
  public openNoti: boolean = false;
  public unreadCount$: Observable<number>;
  public notifies$: Observable<Notification[]>;
  public unreadCount: number = 0;
  public isLoadingNotifications = false;
  
  @Input() user: string = '';
  @Input() userRole: string = '';
  @Input() isDrawerOpen: boolean = true;
  @Output() toggleDrawer = new EventEmitter<void>();
  @Output() redirectTo = new EventEmitter<string>();

  isMobile: boolean = false;

  constructor() {
    this.unreadCount$ = this.noti.unreadCount$;
    this.notifies$ = this.noti.notifications$;  
  }

  ngOnInit() {
    this.checkScreenSize();
    
    // Suscribirse al contador
    this.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        console.log('Navbar - Contador actualizado:', count);
        this.unreadCount = count;
        this.cdr.detectChanges();
      });

    // Suscribirse a las notificaciones
    this.notifies$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        console.log("Notificaciones desde navbar:", data);
      });
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenSize();
  }

  private checkScreenSize() {
    this.isMobile = window.innerWidth < 768;
  }

  onToggleDrawer() {
    this.toggleDrawer.emit();
  }

  onRedirectTo(url: string) {
    this.redirectTo.emit(url);
  }

  /**
   * Abre el dropdown de notificaciones
   * SOLO AQUÍ carga las notificaciones completas
   */
  openoti() {
    this.openNoti = !this.openNoti;
    
    if (this.openNoti && !this.isLoadingNotifications) {
      // Cargar notificaciones completas solo al abrir
      this.isLoadingNotifications = true;
      
      this.noti.loadNotifications()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isLoadingNotifications = false;
            console.log('Notificaciones cargadas al abrir dropdown');
          },
          error: (error) => {
            this.isLoadingNotifications = false;
            console.error('Error al cargar notificaciones:', error);
          }
        });
    }
  }

  /**
   * Marcar todas como leídas
   */
  markAllAsRead() {
    this.noti.markAllAsRead()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('Todas las notificaciones marcadas como leídas');
          this.openNoti = false;
        },
        error: (error) => {
          console.error('Error al marcar como leídas:', error);
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}