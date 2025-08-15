import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PanelAdmin } from "./panel-admin";
import { authGuard } from '../core/guards/auth.guard';

const userRoutes = {
  ADMIN: [
    { path: 'miembros', loadComponent: () => import('./dashboard/lista-users/lista-users').then(m => m.ListaUsers), data: { permission: null } },
    { path: 'dietas', loadComponent: () => import('./dashboard/dietas/dietas').then(m => m.Dietas), data: { permission: null } },
  ],
  NUTRICIONISTA: [
    { path: 'dietas', loadComponent: () => import('./dashboard/dietas/dietas').then(m => m.Dietas), data: { permission: null } },
  ],
  USUARIO: [
    { path: 'dietas', loadComponent: () => import('./dashboard/dietas/dietas').then(m => m.Dietas), data: { permission: null } },
  ],
};

const routes: Routes = [
  {
    path: '',
    component: PanelAdmin,
    children: [
      {
        path: '',
        redirectTo: 'inicio',
        pathMatch: 'full'
      },
      {
        path: 'inicio',
        loadComponent: () => import('./dashboard/inicio/inicio').then(m => m.Inicio),
        canActivate: [authGuard]
      },
      {
        path: 'perfil',
        loadComponent: () => import('./dashboard/perfil/perfil').then(m => m.Perfil),
        canActivate: [authGuard]
      },
      ...userRoutes.ADMIN.map(route => ({...route,canActivate: [authGuard],data: { userRole: 'ADMIN', permission: route.data.permission }})),
      ...userRoutes.NUTRICIONISTA.map(route => ({...route,canActivate: [authGuard],data: { userRole: 'NUTRICIONISTA', permission: route.data.permission }})),
      ...userRoutes.USUARIO.map(route => ({...route,canActivate: [authGuard],data: { userRole: 'USUARIO', permission: route.data.permission }}))
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PanelAdminRoutingModule { }