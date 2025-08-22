import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthServices } from '../services/auth/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthServices);
  const router = inject(Router);

  const currentRoute = state.url;
  const publicRoutes = ['/web', '/login', '/'];
  const isPublicRoute = publicRoutes.includes(currentRoute);

  if (isPublicRoute && authService.isAuthenticated()) {
    router.navigate(['/dashboard']);
    return false;
  }

  if (!isPublicRoute) {
    const token = authService.getToken();
    if (!token) {
      router.navigate(['/web']);
      return false;
    }

    if (!authService.validateTokenIntegrity()) {
      authService.logout();
      router.navigate(['/web']);
      return false;
    }

    if (authService.isTokenExpired()) {
      authService.logout();
      router.navigate(['/web']);
      return false;
    }

    const x = route.data?.['userRole'] || route.data?.['role'];
    if (x && x !== 'GENERAL') {
      const userRole = authService.getUserRole();
      if (!userRole) {
        router.navigate(['/dashboard']);
        return false;
      }

      if (userRole !== x) {
        router.navigate(['/dashboard']);
        return false;
      }
    }
  }

  return true;
};