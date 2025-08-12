import { Routes } from '@angular/router';
import { WebPage } from './components/auth/web-page/web-page';
import { Login } from './components/auth/login/login';

export const routes: Routes = [
  {
    path: 'web',
    component: WebPage
  },
  {
    path: 'login',
    component: Login
  },
  {
    path: 'dashboard',
    loadChildren: () => 
      import('./components/panel-routing-admin.module').then(m => m.PanelAdminRoutingModule)
  },
  {
    path: '',
    redirectTo: 'web',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'web'
  }
];