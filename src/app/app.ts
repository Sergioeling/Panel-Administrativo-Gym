import { Component, signal, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthServices } from './core/services/auth/auth.service';
import { NotificationService } from './core/services/notificacion/notificacion.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('Panel-Administrativo-Gym');
  
  private auth = inject(AuthServices);
  private noti = inject(NotificationService);

  ngOnInit() {
    console.log('🚀 App component iniciando...');
    
    // Verificar si hay usuario autenticado
    const userId = this.auth.getIdUser();
    if (userId) {
      console.log('🔔 Inicializando notificaciones para usuario:', userId);
      this.noti.setUserId(userId);
    } else {
      console.log('🔔 No hay usuario autenticado, omitiendo notificaciones');
      
      // Opcional: Escuchar cambios de autenticación
      // this.auth.currentUser$.subscribe(user => {
      //   if (user && user.id) {
      //     this.noti.setUserId(user.id);
      //   }
      // });
    }
  }
}