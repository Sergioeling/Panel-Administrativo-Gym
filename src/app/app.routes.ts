import { Routes } from '@angular/router';
import { WebPage } from './components/web-page/web-page';
import { Login } from './components/auth/login/login';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'dashboard',
    loadChildren: () => import('./components/panel-routing-admin.module').then(m => m.PanelAdminRoutingModule),
    canActivate: [authGuard]
  },
  {
    path: 'web',
    component: WebPage,
    canActivate: [authGuard]
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