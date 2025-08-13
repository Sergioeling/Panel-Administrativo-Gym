import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthServices } from '../services/auth.service';

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

    const requiredRole = route.data?.['role'];
    if (requiredRole) {
      const userRole = authService.getUserRole();
      if (!userRole || !authService.hasRole(requiredRole)) {
        router.navigate(['/dashboard']);
        return false;
      }
    }
  }

  return true;
};