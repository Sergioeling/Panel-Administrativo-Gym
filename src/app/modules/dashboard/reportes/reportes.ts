import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportesPlatillos } from './reportes-platillos/reportes-platillos';
import { HttpServices } from '../../../core/services/http/http.service';
import { AuthServices } from '../../../core/services/auth/auth.service';



@Component({
  selector: 'app-reportes',
  imports: [ReportesPlatillos, CommonModule],
  templateUrl: './reportes.html',
  styleUrl: './reportes.scss'
})
export class Reportes {
  protected http = inject(HttpServices);
  protected auth = inject(AuthServices);


  ngOnInit(): void {

  }


  getEstadisticasUsuarios() {

  }



}
