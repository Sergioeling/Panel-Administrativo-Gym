import { Routes } from '@angular/router';
import { WebPage } from './modules/website/web-page/web-page';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'dashboard',
    loadChildren: () => import('./modules/dashboard/dashboard-ctrl-routing.module').then(m => m.PanelAdminRoutingModule),
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