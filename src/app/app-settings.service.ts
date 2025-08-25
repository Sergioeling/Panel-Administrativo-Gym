import { Injectable } from '@angular/core';
import { URLS_ENTORNO } from './Environments/urlEntorno';

@Injectable({
  providedIn: 'root'
})


export class AppSettingsService {
  private static ENTORNO = URLS_ENTORNO.produccion;
  public static API_ENDPOINT = AppSettingsService.ENTORNO.API_ENDPOINT;

  public static getHeaders(includeToken: boolean = false): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (includeToken) {
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return headers;
  }
  constructor() { }

}
