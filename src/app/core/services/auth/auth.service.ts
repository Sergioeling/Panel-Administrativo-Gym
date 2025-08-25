import { inject, Injectable, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from "rxjs";
import { Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { HttpServices } from "../http/http.service";
import Swal from 'sweetalert2';

interface LoginResponse {
  status: string;
  message: string;
  data: {
    token: string;
    usuario: {
      id: string;
      user_id: string;
      nombre: string;
      correo: string;
      rol: 'usuario' | 'nutricionista' | 'admin';
    }
  }
}

@Injectable({
  providedIn: 'root'
})
export class AuthServices {
  public role = new BehaviorSubject<string>('GENERAL');
  private route = inject(Router);
  private toastr = inject(ToastrService);
  private http = inject(HttpServices);
  private platformId = inject(PLATFORM_ID);
  readonly panelOpenState = signal(false);
  private appReady = signal(false);
  private secretKey = 'PowerGym2024SecretKey!@#$';


  constructor() {
    this.role.next('');
    this.initializeAuth();
    this.startSecurityMonitoring();
  }

  private btoa64(str: string): string {
    return btoa(unescape(encodeURIComponent(str)));
  }

  private atob64(str: string): string {
    return decodeURIComponent(escape(atob(str)));
  }

  private encrypt(text: string): string {
    if (!text) return '';

    let encrypted = '';
    for (let i = 0; i < text.length; i++) {
      const textChar = text.charCodeAt(i);
      const keyChar = this.secretKey.charCodeAt(i % this.secretKey.length);
      encrypted += String.fromCharCode(textChar ^ keyChar);
    }

    return this.btoa64(encrypted);
  }

  private decrypt(encryptedText: string): string {
    if (!encryptedText) return '';

    try {
      const encrypted = this.atob64(encryptedText);
      let decrypted = '';

      for (let i = 0; i < encrypted.length; i++) {
        const encryptedChar = encrypted.charCodeAt(i);
        const keyChar = this.secretKey.charCodeAt(i % this.secretKey.length);
        decrypted += String.fromCharCode(encryptedChar ^ keyChar);
      }

      return decrypted;
    } catch (error) {
      console.error('Error decrypting:', error);
      return '';
    }
  }

  private setSecureItem(key: string, value: string): void {
    if (this.isBrowser() && value) {
      const encryptedValue = this.encrypt(value);
      localStorage.setItem(key, encryptedValue);
    }
  }

  private getSecureItem(key: string): string {
    if (!this.isBrowser()) return '';

    const encryptedValue = localStorage.getItem(key);
    if (!encryptedValue) return '';

    return this.decrypt(encryptedValue);
  }

  private cleanOldStorage(): void {
    if (!this.isBrowser()) return;

    const keysToCheck = ['token', 'Role', 'id_Usuario', 'user_id', 'nombre', 'correo', 'token_checksum', 'data_checksum'];

    keysToCheck.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          this.decrypt(value);
        } catch {
          localStorage.removeItem(key);
        }
      }
    });
  }

  private migrateOldData(): void {
    if (!this.isBrowser()) return;

    const keysToMigrate = ['token', 'Role', 'id_Usuario', 'user_id', 'nombre', 'correo', 'token_checksum', 'data_checksum'];
    const oldData: { [key: string]: string } = {};

    keysToMigrate.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          this.decrypt(value);
        } catch {
          oldData[key] = value;
          localStorage.removeItem(key);
        }
      }
    });

    Object.entries(oldData).forEach(([key, value]) => {
      this.setSecureItem(key, value);
    });
  }

  forceCleanStorage(): void {
    if (this.isBrowser()) {
      localStorage.clear();
    }
  }

  showStorageContents(): void {
    if (this.isBrowser()) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const encryptedValue = localStorage.getItem(key);
          const decryptedValue = this.getSecureItem(key);
        }
      }
    }
  }

  isAppReady(): boolean {
    return this.appReady();
  }

  private startSecurityMonitoring() {
    if (this.isBrowser()) {
      setInterval(() => {
        if (this.getToken() && !this.validateTokenIntegrity()) {
          console.warn('¡MANIPULACIÓN DETECTADA! Cerrando sesión por seguridad.');
          this.logSecurityViolation('Verificación periódica detectó manipulación');
          this.forceLogout();
        }
      }, 5000);
      window.addEventListener('storage', (e) => {
        if (e.key && ['token', 'Role', 'nombre', 'correo', 'id_Usuario', 'user_id'].includes(e.key)) {
          console.warn('¡MANIPULACIÓN EN TIEMPO REAL DETECTADA!');
          this.logSecurityViolation(`Campo manipulado: ${e.key}`);
          this.forceLogout();
        }
      });
      this.startDOMMonitoring();
    }
  }

  private startDOMMonitoring() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (element.tagName === 'SCRIPT' && !element.hasAttribute('data-trusted')) {
                console.warn('Script no autorizado detectado');
                this.logSecurityViolation('Script malicioso insertado');
                this.forceLogout();
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private forceLogout() {
    console.error('ACCESO BLOQUEADO POR SEGURIDAD');
    this.clearStorage();
    this.role.next('');
    localStorage.setItem('security_block', Date.now().toString());
    this.route.navigate(['/web'], { replaceUrl: true });
    Swal.fire({
      title: 'Acceso Bloqueado',
      text: 'Se detectó manipulación del sistema. Por seguridad, se cerró la sesión.',
      icon: 'error',
      confirmButtonText: 'Entendido',
      allowOutsideClick: false,
      allowEscapeKey: false
    });
  }

  private logSecurityViolation(reason: string) {
    const violation = {
      timestamp: new Date().toISOString(),
      reason: reason,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.error(violation);
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private initializeAuth() {
    if (this.isBrowser()) {
      this.migrateOldData();
      const token = this.getToken();
      if (token && !this.isTokenExpired()) {
        this.setRole();
      }
      this.appReady.set(true);
    }
  }

  decodeToken(): any {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        id: payload.id,
        user_id: payload.user_id,
        correo: payload.correo,
        rol: payload.rol,
        exp: payload.exp
      };
    } catch (error) {
      console.error('Error decodificando token:', error);
      return null;
    }
  }

  getUserFromToken(): any {
    return this.decodeToken();
  }

  testTokenDecoding(): void {
    const tokenData = this.decodeToken();
    if (tokenData) {

    }
  }

  private generateTokenChecksum(token: string): string {
    const hash = btoa(token.split('').reverse().join('')).slice(0, 16);
    return hash;
  }

  private generateDataChecksum(userData: any): string {
    const dataString = JSON.stringify(userData);
    const hash = btoa(dataString.split('').reverse().join('')).slice(0, 20);
    return hash;
  }

  validateTokenIntegrity(): boolean {
    try {
      const token = this.getSecureItem('token');
      const storedTokenChecksum = this.getSecureItem('token_checksum');
      const storedDataChecksum = this.getSecureItem('data_checksum');

      if (!token || !storedTokenChecksum || !storedDataChecksum) {
        return false;
      }

      const expectedTokenChecksum = this.generateTokenChecksum(token);
      if (storedTokenChecksum !== expectedTokenChecksum) {
        console.warn('Token manipulado detectado');
        return false;
      }

      const userData = {
        Role: this.getSecureItem('Role'),
        id_Usuario: this.getSecureItem('id_Usuario'),
        user_id: this.getSecureItem('user_id'),
        nombre: this.getSecureItem('nombre'),
        correo: this.getSecureItem('correo')
      };

      const expectedDataChecksum = this.generateDataChecksum(userData);
      if (storedDataChecksum !== expectedDataChecksum) {
        console.warn('Datos del usuario manipulados detectados');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validando integridad del localStorage:', error);
      return false;
    }
  }

  login(credenciales: { correo: string; contrasena: string }): Observable<any> {
    return new Observable(observer => {
      this.http.login(credenciales).subscribe({
        next: (response: LoginResponse) => {
          if (response.status === 'success' && response.data?.token) {
            localStorage.clear();

            const token = response.data.token;
            const userData = {
              Role: response.data.usuario.rol.toUpperCase(),
              id_Usuario: response.data.usuario.id,
              user_id: response.data.usuario.user_id,
              nombre: response.data.usuario.nombre,
              correo: response.data.usuario.correo
            };

            this.setStorage({ item: 'token', value: token });
            this.setStorage({ item: 'Role', value: userData.Role });
            this.setStorage({ item: 'id_Usuario', value: userData.id_Usuario });
            this.setStorage({ item: 'user_id', value: userData.user_id });
            this.setStorage({ item: 'nombre', value: userData.nombre });
            this.setStorage({ item: 'correo', value: userData.correo });
            this.setStorage({ item: 'token_checksum', value: this.generateTokenChecksum(token) });
            this.setStorage({ item: 'data_checksum', value: this.generateDataChecksum(userData) });
            this.setRole();

            this.appReady.set(true);

            Swal.fire({
              title: '¡Bienvenido!',
              text: `Hola ${response.data.usuario.nombre}`,
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
            });

            observer.next(response);
            observer.complete();
          } else {
            observer.error(new Error(response.message || 'Error en login'));
          }
        },
        error: (error) => {
          Swal.fire({
            title: 'Error de Autenticación',
            text: 'Credenciales incorrectas',
            icon: 'error',
            confirmButtonText: 'Intentar de nuevo'
          });
          observer.error(error);
        }
      });
    });
  }

  logout() {
    if (this.isBrowser()) {
      this.clearStorage();
      this.role.next('');
      this.route.navigate(['/web']);

      Swal.fire({
        title: 'Tu sesión ha expirado',
        text: 'Ingrese sus credenciales nuevamente',
        icon: 'warning',
        timer: 1500,
        showConfirmButton: false
      });
    }
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  getUserRole(): string | null {
    const tokenData = this.decodeToken();
    if (tokenData?.rol) {
      const tokenRole = tokenData.rol.toUpperCase();
      return tokenRole;
    }
    const storageRole = this.isBrowser() ? localStorage.getItem('Role') : null;
    return storageRole;
  }

  hasRole(requiredRole: string | string[]): boolean {
    const userRole = this.getUserRole();
    if (!userRole) return false;

    if (Array.isArray(requiredRole)) {
      return requiredRole.some(role => userRole.toLowerCase() === role.toLowerCase());
    }

    return userRole.toLowerCase() === requiredRole.toLowerCase();
  }

  isAuthenticated(): boolean {
    if (!this.isBrowser()) return false;

    const token = this.getToken();
    if (!token) return false;
    if (!this.validateTokenIntegrity()) {
      console.warn('Integridad comprometida en isAuthenticated()');
      this.forceLogout();
      return false;
    }

    // Verificar expiración
    if (this.isTokenExpired()) {
      this.logout();
      return false;
    }

    return true;
  }

  getToken(): string | null {
    if (!this.isBrowser()) return null;

    const token = this.getSecureItem('token');
    if (token && !this.quickIntegrityCheck()) {
      console.warn('Token comprometido detectado');
      this.forceLogout();
      return null;
    }

    return token;
  }

  private quickIntegrityCheck(): boolean {
    try {
      const token = this.getSecureItem('token');
      const tokenChecksum = this.getSecureItem('token_checksum');

      if (!token || !tokenChecksum) return false;

      return this.generateTokenChecksum(token) === tokenChecksum;
    } catch {
      return false;
    }
  }

  setRole() {
    if (this.isBrowser()) {
      const ses = this.getSecureItem('Role');
      if (ses) {
        this.role.next(ses.toUpperCase());
      } else {
        this.role.next('');
      }
    }
  }

  getRole() {
    this.setRole();
    return this.role.getValue() ? this.role.getValue() : false;
  }

  getIdUser(): number {
    const tokenData = this.decodeToken();
    if (tokenData?.id) {
      return parseInt(tokenData.id);
    }
    return this.isBrowser() ? parseInt(this.getStorage('id_Usuario') || '0') : 0;
  }

  getUser(): string {
    const tokenData = this.decodeToken();
    if (tokenData?.user_id) {
      return tokenData.user_id;
    }
    return this.isBrowser() ? (this.getStorage('user_id') || '0') : '0';
  }

  getUserName(): string {
    return this.isBrowser() ? this.getStorage('nombre') || 'Usuario' : 'Usuario';
  }

  getUserEmail(): string {
    const tokenData = this.decodeToken();
    if (tokenData?.correo) {
      return tokenData.correo;
    }
    return this.isBrowser() ? this.getStorage('correo') || '' : '';
  }

  setStorage(values: any) {
    if (this.isBrowser()) {
      this.setSecureItem(values.item, values.value);
    }
  }

  getStorage(value: any) {
    return this.isBrowser() ? this.getSecureItem(value) : '';
  }

  removeStorage(value: any) {
    if (this.isBrowser()) {
      localStorage.removeItem(value);
    }
  }

  clearStorage() {
    if (this.isBrowser()) {
      localStorage.clear();
    }
  }

  redirectTo(url: string) {
    this.setRole();
    this.route.navigate([url], { replaceUrl: true });
  }

  setMenu(value: any) {
    this.panelOpenState.set(value);
  }

  getstateMenu() {
    return this.panelOpenState;
  }


  generateNotification(message: string, title: string, type: string) {
    // @ts-ignore
    this.toastr[type](message, title);
  }

  generateMessage(type: string, tbl: string) {
    if (type == 'success')
      this.generateNotification(tbl, 'Registros encontrados', 'success');
    else
      this.generateNotification('La tabla ' + tbl + ' no cuenta con registros', 'Error', 'error');
  }



  checkGeneralRutes(type: any, state?: any) {
    if (this.isBrowser()) {
      return this.getRole() == type || type == 'general' && this.getSecureItem('Role') != undefined;
    }
    return false;
  }


  DataByTokenPromise(data: any, Ruta: string) {
    return new Promise((resolve, reject) => {
      this.http.changeDataByToken(data, Ruta).subscribe(
        (data: any) => {
          resolve(data.response);
        },
        () => {
          reject(true);
        }
      );
    });
  }

  setData(tbl: string, tblMessag: string, id?: any, selects?: string, messageError?: boolean) {
    return new Promise((resolve, reject) => {
      this.DataByTokenPromise({ tbl, id, selects }, 'getValues').then((data: any) => {
        if (tblMessag != '') {
          this.generateMessage('success', tblMessag);
        }
        resolve(data);
      }).catch(() => {
        if (messageError) {
          this.generateMessage('error', tbl);
        }
        reject([]);
      });
    });
  }

  insertValues(values: any[], tblMessag: string, tbl: any, showMessage: boolean = true) {
    return new Promise((resolve, reject) => {
      const val = { valores: values, action: tbl };
      this.DataByTokenPromise(val, 'insertValues').then(() => {
        if (showMessage) {
          this.generateNotification('Se ha insertado un nuevo registro a la tabla ' + tblMessag, 'Inserción', 'info');
        }
        resolve(true);
      }).catch(() => {
        if (showMessage) {
          this.generateNotification('No se pudo realizar la inserción de la tabla ' + tblMessag, 'Inserción', 'error');
        }
        reject(true);
      });
    });
  }

  changeValues(values: any, tblMessag: string, tbl: any, id: any) {
    return new Promise((resolve, reject) => {
      const val = { valores: values, action: tbl, id };
      this.DataByTokenPromise(val, 'updateValues').then(() => {
        this.generateNotification('Has actualizado la información de la tabla ' + tblMessag, 'Actualización', 'info');
        resolve(true);
      }).catch(() => {
        this.generateNotification('La actualización de la tabla ' + tblMessag + ' falló', 'Actualización', 'error');
        reject(true);
      });
    });
  }

  deleteRegistro(id: number, tabla: string) {
    return new Promise((resolve, reject) => {
      this.DataByTokenPromise({ id, tabla }, 'delete').then(() => {
        this.generateNotification('Registro eliminado correctamente', 'Eliminación', 'info');
        resolve(true);
      }).catch(() => {
        this.generateNotification('La eliminación del registro falló', 'Eliminación', 'error');
        reject(true);
      });
    });
  }
}