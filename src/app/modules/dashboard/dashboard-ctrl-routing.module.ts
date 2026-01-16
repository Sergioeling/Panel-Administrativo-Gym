import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PanelAdmin } from './panel-admin';
import { Inicio } from './inicio/inicio';
import { Perfil } from './perfil/perfil';
import { ListaUsers } from './lista-users/lista-users';
import { alimentos } from './alimentos/alimentos';
import { Platillos } from './platillos/platillos';
import { TipoComidaComponent } from './tipo-comida/tipo-comida';
import { authGuard } from '../../core/guards/auth.guard';
import path from 'path';
import { Component } from '@angular/compiler';
import { permission } from 'process';
import { TipoObjetivoComponent } from './tipo-objetivo/tipo-objetivo';
import { TipoDietaComponent } from './tipo-dieta/tipo-dieta';
import { Reportes } from './reportes/reportes';
import { RevisionComponent } from './revision/revision';

const userRoutes = {
  ADMIN: [
    { path: 'miembros', component: ListaUsers, data: { permission: null } },
    { path: 'alimentos', component: alimentos, data: { permission: null } },
    { path: 'tipo_comida', component: TipoComidaComponent, data: { permission: null } },
    { path: 'tipo_objetivo', component: TipoObjetivoComponent, data: { permission: null } },
    { path: 'tipo_dieta', component: TipoDietaComponent, data: { permission: null } },
    { path: 'reportes-admin', component: Reportes, data: { permission: null } },
    { path: 'revision', component: RevisionComponent, data: { permission: null } },
  ],
  NUTRICIONISTA: [
    { path: 'inicio', component: Inicio, data: { permission: null } },
    { path: 'platillos-nutricionista', component: Platillos, data: { permission: null } },

  ],
  USUARIO: [
    { path: 'inicio', component: Inicio, data: { permission: null } },
  ],
  GENERAL: [
    { path: 'inicio', component: Inicio, data: { permission: null } },
    { path: 'perfil', component: Perfil, data: { permission: null } },
  ]
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

      ...userRoutes.GENERAL.map(route => ({ ...route, canActivate: [authGuard], data: { userRole: 'GENERAL', permission: route.data.permission } })),
      ...userRoutes.ADMIN.map(route => ({ ...route, canActivate: [authGuard], data: { userRole: 'ADMIN', permission: route.data.permission } })),
      ...userRoutes.NUTRICIONISTA.map(route => ({ ...route, canActivate: [authGuard], data: { userRole: 'NUTRICIONISTA', permission: route.data.permission } })),
      ...userRoutes.USUARIO.map(route => ({ ...route, canActivate: [authGuard], data: { userRole: 'USUARIO', permission: route.data.permission } })),
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PanelAdminRoutingModule { }