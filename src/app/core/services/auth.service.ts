import { inject, Injectable, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from "rxjs";
import { Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { HttpServices } from "./http.service";
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

  constructor() {
    this.role.next('');
    this.initializeAuth();
    this.startSecurityMonitoring();
  }

  private startSecurityMonitoring() {
    if (this.isBrowser()) {
      // Verificar integridad cada 5 segundos (SÚPER AGRESIVO)
      setInterval(() => {
        if (this.getToken() && !this.validateTokenIntegrity()) {
          console.warn('🚨 ¡MANIPULACIÓN DETECTADA! Cerrando sesión por seguridad.');
          this.logSecurityViolation('Verificación periódica detectó manipulación');
          this.forceLogout();
        }
      }, 5000); // 5 segundos

      // Detectar cambios en localStorage en tiempo real
      window.addEventListener('storage', (e) => {
        if (e.key && ['token', 'Role', 'nombre', 'correo', 'id_Usuario', 'user_id'].includes(e.key)) {
          console.warn('🚨 ¡MANIPULACIÓN EN TIEMPO REAL DETECTADA!');
          this.logSecurityViolation(`Campo manipulado: ${e.key}`);
          this.forceLogout();
        }
      });

      // Monitoreo adicional con MutationObserver para cambios de DOM
      this.startDOMMonitoring();
    }
  }

  // Monitoreo adicional del DOM para detectar scripts maliciosos
  private startDOMMonitoring() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (element.tagName === 'SCRIPT' && !element.hasAttribute('data-trusted')) {
                console.warn('🚨 Script no autorizado detectado');
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

  // Logout forzado con bloqueo total
  private forceLogout() {
    console.error('🔒 ACCESO BLOQUEADO POR SEGURIDAD');
    
    // Limpiar TODO
    this.clearStorage();
    this.role.next('');
    
    // Bloquear temporalmente (opcional)
    localStorage.setItem('security_block', Date.now().toString());
    
    // Redirigir a web inmediatamente
    this.route.navigate(['/web'], { replaceUrl: true });
    
    // Mostrar alerta de seguridad
    Swal.fire({
      title: '🚨 Acceso Bloqueado',
      text: 'Se detectó manipulación del sistema. Por seguridad, se cerró la sesión.',
      icon: 'error',
      confirmButtonText: 'Entendido',
      allowOutsideClick: false,
      allowEscapeKey: false
    });
  }

  // Registrar violaciones de seguridad
  private logSecurityViolation(reason: string) {
    const violation = {
      timestamp: new Date().toISOString(),
      reason: reason,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    console.error('🔐 VIOLACIÓN DE SEGURIDAD:', violation);
    
    // Podrías enviar esto a tu backend para auditoría
    // this.http.post('security/violation', violation).subscribe();
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private initializeAuth() {
    if (this.isBrowser()) {
      const token = this.getToken();
      if (token && !this.isTokenExpired()) {
        this.setRole();
      }
    }
  } 

  // ============ MÉTODOS DE DECODIFICACIÓN JWT ============

  // Decodificar el token JWT y extraer datos del usuario
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

  // Obtener datos del usuario desde el token
  getUserFromToken(): any {
    return this.decodeToken();
  }

  // Método de prueba para verificar decodificación
  testTokenDecoding(): void {
    const tokenData = this.decodeToken();
    if (tokenData) {
      console.log('=== DATOS DECODIFICADOS DEL TOKEN ===');
      console.log(tokenData);
    } else {
      console.log('No se pudo decodificar el token');
    }
  }

  // ============ MÉTODOS DE SEGURIDAD ============

  // Generar checksum para validar integridad
  private generateTokenChecksum(token: string): string {
    const hash = btoa(token.split('').reverse().join('')).slice(0, 16);
    return hash;
  }

  // Generar checksum para todos los datos del usuario
  private generateDataChecksum(userData: any): string {
    const dataString = JSON.stringify(userData);
    const hash = btoa(dataString.split('').reverse().join('')).slice(0, 20);
    return hash;
  }

  // Validar integridad completa del localStorage
  validateTokenIntegrity(): boolean {
    try {
      const token = localStorage.getItem('token');
      const storedTokenChecksum = localStorage.getItem('token_checksum');
      const storedDataChecksum = localStorage.getItem('data_checksum');
      
      if (!token || !storedTokenChecksum || !storedDataChecksum) {
        return false;
      }

      // Verificar integridad del token
      const expectedTokenChecksum = this.generateTokenChecksum(token);
      if (storedTokenChecksum !== expectedTokenChecksum) {
        console.warn('Token manipulado detectado');
        return false;
      }

      // Verificar integridad de los datos del usuario
      const userData = {
        Role: localStorage.getItem('Role'),
        id_Usuario: localStorage.getItem('id_Usuario'),
        user_id: localStorage.getItem('user_id'),
        nombre: localStorage.getItem('nombre'),
        correo: localStorage.getItem('correo')
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

  // ============ MÉTODOS DE AUTENTICACIÓN ============

  login(credenciales: { correo: string; contrasena: string }): Observable<any> {
    return new Observable(observer => {
      this.http.login(credenciales).subscribe({
        next: (response: LoginResponse) => {
          if (response.status === 'success' && response.data?.token) {
            // Guardar token y generar checksum para seguridad
            const token = response.data.token;
            const userData = {
              Role: response.data.usuario.rol.toUpperCase(),
              id_Usuario: response.data.usuario.id,
              user_id: response.data.usuario.user_id,
              nombre: response.data.usuario.nombre,
              correo: response.data.usuario.correo
            };

            // Guardar todos los datos
            this.setStorage({ item: 'token', value: token });
            this.setStorage({ item: 'Role', value: userData.Role });
            this.setStorage({ item: 'id_Usuario', value: userData.id_Usuario });
            this.setStorage({ item: 'user_id', value: userData.user_id });
            this.setStorage({ item: 'nombre', value: userData.nombre });
            this.setStorage({ item: 'correo', value: userData.correo });

            // Generar y guardar checksums de seguridad
            this.setStorage({ item: 'token_checksum', value: this.generateTokenChecksum(token) });
            this.setStorage({ item: 'data_checksum', value: this.generateDataChecksum(userData) });

            // Actualizar rol actual
            this.setRole();

            // Mostrar mensaje de éxito
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
      this.route.navigate(['/web']);  // Cambiar a /web
      
      Swal.fire({
        title: 'Sesión Cerrada',
        text: 'Has cerrado sesión exitosamente',
        icon: 'info',
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
    // Priorizar datos del token sobre localStorage
    const tokenData = this.decodeToken();
    if (tokenData?.rol) {
      return tokenData.rol.toUpperCase();
    }
    // Fallback al localStorage
    return this.isBrowser() ? localStorage.getItem('Role') : null;
  }

  hasRole(requiredRole: string | string[]): boolean {
    const userRole = this.getUserRole();
    if (!userRole) return false;

    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(userRole.toLowerCase());
    }
    return userRole.toLowerCase() === requiredRole.toLowerCase();
  }

  isAuthenticated(): boolean {
    if (!this.isBrowser()) return false;
    
    const token = this.getToken();
    if (!token) return false;
    
    // Verificar integridad del localStorage (SÚPER ESTRICTO)
    if (!this.validateTokenIntegrity()) {
      console.warn('🚨 Integridad comprometida en isAuthenticated()');
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
    
    const token = localStorage.getItem('token');
    
    // Validación adicional cada vez que se obtiene el token
    if (token && !this.quickIntegrityCheck()) {
      console.warn('🚨 Token comprometido detectado');
      this.forceLogout();
      return null;
    }
    
    return token;
  }

  // Verificación rápida de integridad
  private quickIntegrityCheck(): boolean {
    try {
      const token = localStorage.getItem('token');
      const tokenChecksum = localStorage.getItem('token_checksum');
      
      if (!token || !tokenChecksum) return false;
      
      return this.generateTokenChecksum(token) === tokenChecksum;
    } catch {
      return false;
    }
  }

  //GESTIÓN DE ROLES
  setRole() {
    if (this.isBrowser()) {
      const ses = localStorage.getItem('Role');
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

  // GESTIÓN DE USUARIOS
  getIdUser(): number {
    // Priorizar datos del token
    const tokenData = this.decodeToken();
    if (tokenData?.id) {
      return parseInt(tokenData.id);
    }
    // Fallback al localStorage
    return this.isBrowser() ? parseInt(this.getStorage('id_Usuario') || '0') : 0;
  }

  getUser(): string {
    // Priorizar datos del token
    const tokenData = this.decodeToken();
    if (tokenData?.user_id) {
      return tokenData.user_id;
    }
    // Fallback al localStorage
    return this.isBrowser() ? (this.getStorage('user_id') || '0') : '0';
  }

  getUserName(): string {
    // Para el nombre, usar localStorage ya que no está en el token
    return this.isBrowser() ? this.getStorage('nombre') || 'Usuario' : 'Usuario';
  }

  getUserEmail(): string {
    // Priorizar datos del token
    const tokenData = this.decodeToken();
    if (tokenData?.correo) {
      return tokenData.correo;
    }
    // Fallback al localStorage
    return this.isBrowser() ? this.getStorage('correo') || '' : '';
  }

  //STORAGE MANAGEMENT
  setStorage(values: any) {
    if (this.isBrowser()) {
      localStorage.setItem(values.item, values.value);
    }
  }

  getStorage(value: any) {
    return this.isBrowser() ? localStorage.getItem(value) : '';
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

  //NAVEGACIÓN
  redirectTo(url: string) {
    this.setRole();
    this.route.navigate([url], { replaceUrl: true });
  }

  //GESTIÓN DE MENÚ
  setMenu(value: any) {
    this.panelOpenState.set(value);
  }

  getstateMenu() {
    return this.panelOpenState;
  }

  // ============ MÉTODOS DE UTILIDAD ============

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

  // Método para verificar permisos
  checkPermissions(permission: string): boolean {
    const userRole = this.getUserRole();
    if (!userRole) return false;

    // Definir permisos por rol
    const rolePermissions = {
      'ADMIN': ['*'], // Admin tiene todos los permisos
      'NUTRICIONISTA': ['dietas', 'usuarios', 'reportes'],
      'USUARIO': ['perfil', 'dietas_asignadas']
    };

    const permissions = rolePermissions[userRole as keyof typeof rolePermissions] || [];
    return permissions.includes('*') || permissions.includes(permission);
  }

  checkPermissionsUser(permissions: string) {
    if (this.isBrowser()) {
      const activePermissions = localStorage.getItem('PERMISSIONS');
      if (activePermissions) {
        const perm = activePermissions.split(',');
        return perm.includes(permissions);
      }
    }
    return false;
  }

  checkGeneralRutes(type: any, state?: any) {
    if (this.isBrowser()) {
      return this.getRole() == type || type == 'general' && localStorage.getItem('Role') != undefined;
    }
    return false;
  }

  // Métodos de compatibilidad (mantener para no romper código existente)
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