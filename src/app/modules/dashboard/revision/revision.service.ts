import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class RevisionService {

  constructor(private http: HttpClient) {}

  getNutricionistasPendientes() {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.get<any>(
      'http://localhost/Backend/Rutas.php?nutricionistas-pendientes',
      { headers }
    );
  }
}
