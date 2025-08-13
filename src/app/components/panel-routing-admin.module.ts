import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PanelAdmin } from "./panel-admin";
import path from 'path';

const userRoutes = {
  ADMIN: [
    { path: 'miembros', loadComponent: () => import('./dashboard/dietas/dietas').then(m => m.Dietas), data: { permission: null } },
    { path: 'entrenadores', loadComponent: () => import('./dashboard/dietas/dietas').then(m => m.Dietas), data: { permission: null } },
    { path: 'dietas', loadComponent: () => import('./dashboard/dietas/dietas').then(m => m.Dietas), data: { permission: null } },
    { path: 'ejercicios', loadComponent: () => import('./dashboard/dietas/dietas').then(m => m.Dietas), data: { permission: null } },
    { path: 'pagos', loadComponent: () => import('./dashboard/dietas/dietas').then(m => m.Dietas), data: { permission: null } },
    { path: 'equipos', loadComponent: () => import('./dashboard/dietas/dietas').then(m => m.Dietas), data: { permission: null } },
    { path: 'horarios', loadComponent: () => import('./dashboard/dietas/dietas').then(m => m.Dietas), data: { permission: null } },
    { path: 'reportes', loadComponent: () => import('./dashboard/dietas/dietas').then(m => m.Dietas), data: { permission: null } }
  ],
  ENTRENADOR: [
    { path: 'mis-clientes', loadComponent: () => import('./dashboard/dietas/dietas').then(m => m.Dietas), data: { permission: null } },
    { path: 'rutinas', loadComponent: () => import('./dashboard/dietas/dietas').then(m => m.Dietas), data: { permission: null } },
    { path: 'dietas-entrenador', loadComponent: () => import('./dashboard/dietas/dietas').then(m => m.Dietas), data: { permission: null } }
  ],
  RECEPCIONISTA: [
    { path: 'registro-miembros', loadComponent: () => import('./dashboard/dietas/dietas').then(m => m.Dietas), data: { permission: null } },
    { path: 'pagos-recepcion', loadComponent: () => import('./dashboard/dietas/dietas').then(m => m.Dietas), data: { permission: null } }
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
        loadComponent: () => import('./dashboard/dietas/dietas').then(m => m.Dietas) 
      },
      {
        path: 'perfil',
        loadComponent: () => import('./dashboard/dietas/dietas').then(m => m.Dietas)
      },
      ...userRoutes.ADMIN.map(route => ({ ...route, data: { userRole: 'ADMIN', permission: route.data.permission }})),
      ...userRoutes.ENTRENADOR.map(route => ({ ...route, data: { userRole: 'ENTRENADOR', permission: route.data.permission }})),
      ...userRoutes.RECEPCIONISTA.map(route => ({ ...route, data: { userRole: 'RECEPCIONISTA', permission: route.data.permission }}))
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PanelAdminRoutingModule { }