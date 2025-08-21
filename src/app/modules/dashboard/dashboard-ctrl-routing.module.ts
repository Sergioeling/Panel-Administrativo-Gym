import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PanelAdmin } from './panel-admin';
import { Inicio } from './inicio/inicio';
import { Perfil } from './perfil/perfil';
import { ListaUsers } from './lista-users/lista-users';
import { alimentos } from './alimentos/alimentos';

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
        component: Inicio,
      },
      {
        path: 'perfil',
        component: Perfil,
      },
      {
        path: 'miembros',
        component: ListaUsers,
      },
      {
        path: 'alimentos',
        component: alimentos,
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PanelAdminRoutingModule { }