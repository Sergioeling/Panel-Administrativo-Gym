import { Injectable, inject } from '@angular/core';
import { AppSettingsService } from '../../app-settings.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, Observable, catchError, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HttpServices {
  private url = `${AppSettingsService.API_ENDPOINT}`;
  private http = inject(HttpClient);

  constructor() { }

  private getHeaders(): HttpHeaders {
    const headers = AppSettingsService.getHeaders(true);
    return new HttpHeaders(headers);
  }

  changedtaToken(datas: string, access: any): Observable<any> {
    const datosObj = JSON.parse(datas);
    return this.post(access, datosObj);
  }

  changeDataByToken(values: any, Ruta: string) {
    let datas = JSON.stringify(values);
    return this.changedtaToken(datas, Ruta);
  }

  request(method: 'GET' | 'POST' | 'PUT' | 'DELETE', endpoint: string, data?: any): Observable<any> {
    const url = `${this.url}${endpoint}`;
    const headers = this.getHeaders();

    let httpCall: Observable<any>;

    switch (method) {
      case 'GET':
        httpCall = this.http.get(url, { headers });
        break;
      case 'POST':
        httpCall = this.http.post(url, data || {}, { headers });
        break;
      case 'PUT':
        httpCall = this.http.put(url, data || {}, { headers });
        break;
      case 'DELETE':
        httpCall = this.http.delete(url, { headers });
        break;
      default:
        throw new Error(`Método HTTP ${method} no soportado`);
    }

    return httpCall.pipe(
      map((resp: any) => resp),
      catchError((error) => {
        console.error(`Error en ${method} ${endpoint}:`, error);
        return throwError(() => error);
      })
    );
  }


  get(endpoint: string): Observable<any> {
    return this.request('GET', endpoint);
  }

  post(endpoint: string, data: any): Observable<any> {
    return this.request('POST', endpoint, data);
  }

  put(endpoint: string, data: any): Observable<any> {
    return this.request('PUT', endpoint, data);
  }

  delete(endpoint: string): Observable<any> {
    return this.request('DELETE', endpoint);
  }


  obtenerDietas(): Observable<any> {
    return this.get('obtener-dietas');
  }

  login(credenciales: any): Observable<any> {
    return this.post('login', credenciales);
  }

  crearUsuario(usuarioData: any): Observable<any> {
    return this.post('crear-usuario', usuarioData);
  }

  obtenerUsuarios(): Observable<any> {
    return this.get('usuarios');
  }

  eliminarUsuario(userId: number): Observable<any> {
    return this.delete(`usuarios?id=${userId}`);
  }


}