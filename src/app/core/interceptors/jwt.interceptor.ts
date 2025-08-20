import { HttpInterceptorFn, HttpErrorResponse, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthServices } from '../services/auth/auth.service';
import { catchError } from 'rxjs/operators';
import { throwError, Observable } from 'rxjs';
import Swal from 'sweetalert2';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthServices);
  const router = inject(Router);

  let authReq = req;
  const token = auth.getToken();
  
  if (token && !req.url.includes('login')) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse): Observable<HttpEvent<any>> => {
      if (error.status === 401) {
        auth.logout();
        
        Swal.fire({
          title: 'Sesión Expirada',
          text: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
          icon: 'warning',
          confirmButtonText: 'Vale',
          allowOutsideClick: false
        }).then(() => {
          router.navigate(['/web']);
        });
      }
      return throwError(() => error);
    })
  );
};