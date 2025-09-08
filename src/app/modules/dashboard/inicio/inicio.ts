import { Component,inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpServices } from '../../../core/services/http/http.service';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss'
})
export class Inicio {

  protected http = inject(HttpServices);

  constructor() { }

  ngOnInit(){
    this.verificarConexion();
  }

  verificarConexion(): void {
    this.http.verificarConexion().subscribe({
      next: (response) => {
        console.log('Conexión exitosa:', response);
      },
      error: (error) => {
        console.error('Error en la conexión:', error);
      }
    });
  }

}
