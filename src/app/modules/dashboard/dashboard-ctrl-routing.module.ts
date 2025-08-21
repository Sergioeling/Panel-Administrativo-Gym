import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PanelAdmin } from './panel-admin';
import { authGuard } from '../../core/guards/auth.guard';
import { Inicio } from './inicio/inicio';
import { Perfil } from './perfil/perfil';
import { ListaUsers } from './lista-users/lista-users';
import { Dietas } from './dietas/dietas';

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
        path: 'dietas',
        component: Dietas,
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PanelAdminRoutingModule { }