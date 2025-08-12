import { Injectable, inject } from '@angular/core';
import { AppSettingsService } from '../../app-settings.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, Observable, Timestamp } from 'rxjs';


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
    return this.http.post(this.url + access, JSON.stringify(datosObj), { headers: this.getHeaders() })
      .pipe(map((resp: any) => {
        return resp;
      }));
  }

  changeDataByToken(values: any, Ruta: string) {
    let datas = JSON.stringify(values);
    return this.changedtaToken(datas, Ruta);
  }

  //examople de uso 
  ValidLogin(data: any): Observable<any> {
    let datas = JSON.stringify({ valores: data });
    return this.changedtaToken(datas, 'ruta');
  }



}
