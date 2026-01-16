import { Component, EventEmitter, Input, Output, inject, OnInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { MatIconButton } from "@angular/material/button";
import { AuthServices } from '../../../../core/services/auth/auth.service';
import { NotificationService } from '../../../../core/services/notificacion/notificacion.service';
import { Observable } from 'rxjs';

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

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, MatIconButton, AsyncPipe],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class Navbar implements OnInit {
  private auth = inject(AuthServices);
  private noti = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  public openNoti: boolean = false;
  // Hacer el observable público y tipado
  public unreadCount$: Observable<number>;
  public notifies$: Observable<Notification[]>;
   public unreadCount: number = 0; // Variable alternativa
  
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
    
    // Suscripción adicional para debugging y forzar detección de cambios
    this.unreadCount$.subscribe(count => {
      console.log('Navbar - Contador actualizado:', count);
      this.unreadCount = count;
      this.cdr.detectChanges(); // Forzar detección de cambios
    });

    this.notifies$.subscribe(data => {
      console.log("Notificaciones desde navbar: ", data);
    }) 


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

  openoti() {
    this.openNoti = !this.openNoti;
  }
}