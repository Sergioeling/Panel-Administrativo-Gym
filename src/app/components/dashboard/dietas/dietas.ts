import { Component, inject, OnInit} from '@angular/core';
import { AuthServices } from '../../../core/services/auth.service';
import { HttpServices } from '../../../core/services/http.service';

@Component({
  selector: 'app-dietas',
  standalone: true, 
  imports: [],
  templateUrl: './dietas.html',
  styleUrl: './dietas.scss' 
})
export class Dietas {
  private auth = inject(AuthServices);
  private http = inject(HttpServices);


  ngOnInit(){
    this.obtenerDietas();
  }

  
  obtenerDietas(){
    this.http.obtenerDietas().subscribe(
      (response) => {
        console.log('Dietas obtenidas:', response);
      },
      (error) => {
        console.error('Error al obtener dietas:', error);
      }
    );
  }


}
