import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PanelAdmin } from "./panel-admin";
import path from 'path';

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
        loadComponent: () => import('./dashboard/inicio/inicio').then(m => m.Inicio)
      },
      {
        path: 'perfil',
        loadComponent: () => import('./dashboard/perfil/perfil').then(m => m.Perfil)
      },
      ...userRoutes.ADMIN.map(route => ({ ...route, data: { userRole: 'ADMIN', permission: route.data.permission } })),
      ...userRoutes.NUTRICIONISTA.map(route => ({ ...route, data: { userRole: 'NUTRICIONISTA', permission: route.data.permission } })),
      ...userRoutes.USUARIO.map(route => ({ ...route, data: { userRole: 'USUARIO', permission: route.data.permission } }))
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PanelAdminRoutingModule { }