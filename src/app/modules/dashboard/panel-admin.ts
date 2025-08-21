import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from "@angular/router";
import { MatDrawer, MatDrawerContainer, MatSidenavModule } from "@angular/material/sidenav";
import { MatIcon } from "@angular/material/icon";
import { AuthServices } from '../../core/services/auth/auth.service';
import { FormsModule } from "@angular/forms";
import { MatCardModule } from '@angular/material/card';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import { Navbar } from '../shared/components/navbar/navbar';

@Component({
  selector: 'app-panel-admin',
  standalone: true,
  imports: [
    RouterOutlet,
    MatCardModule,
    MatDrawerContainer,
    MatDrawer,
    MatSidenavModule,
    MatIcon,
    NgForOf,
    NgIf,
    FormsModule,
    CommonModule,
    Navbar
  ],
  templateUrl: './panel-admin.html',
  styleUrl: './panel-admin.scss'
})
export class PanelAdmin implements OnInit {
  private auth = inject(AuthServices);
  private router = inject(Router);

  protected menu: any[] = [];
  protected user: string = '';
  protected userRole: string = '';
  protected activeRoute: string = '';
  protected isDrawerOpen: boolean = true;
  protected expandedMenus: { [key: string]: boolean } = {};

  @ViewChild('drawer') drawerlstn!: MatDrawer;

  constructor() {
    this.router.events.subscribe((event: any) => {
      if (event instanceof NavigationEnd) {
        this.activeRoute = event.urlAfterRedirects;
      }
    });
  }

  ngOnInit() {
    this.InitMenu();
    this.loadUserData();
    this.expandedMenus['dashboard'] = true;
  }

  loadUserData() {
    this.user = this.auth.getUserName();
    this.userRole = this.auth.getUserRole() || 'USUARIO';
  }

  toggleMenu(menuId: string) {
    this.expandedMenus[menuId] = !this.expandedMenus[menuId];
  }

  isMenuExpanded(menuId: string): boolean {
    return this.expandedMenus[menuId] || false;
  }

  showMenu() {
    this.isDrawerOpen = !this.isDrawerOpen;
    if (this.drawerlstn) {
      this.isDrawerOpen ? this.drawerlstn.open() : this.drawerlstn.close();
    }
  }

  onToggleDrawer() {
    this.showMenu();
  }

  onNavbarRedirect(url: string) {
    this.redirectTo(url);
  }

  redirectTo(url: any) {
    if (url == 'web') {
      localStorage.clear();
    }
    this.auth.redirectTo(url);
  }

  InitMenu() {
    this.menu = [
      {
        title: 'Dashboard', icon: null, bi: 'bi-house', id: 'dashboard', role: '', options: [
          { title: 'Inicio', route: 'inicio', role: '', icon: null, bi: 'bi-house-door' },
          { title: 'Mi Perfil', route: 'perfil', role: '', icon: null, bi: 'bi-person' },
        ]
      },
      {
        title: 'Administración', icon: null, bi: 'bi-gear', id: 'admin', role: 'ADMIN', options: [
          { title: 'Lista de Usuarios', route: 'miembros', role: 'ADMIN', icon: null, bi: 'bi-people' },

        ]
      },
      {
        title: 'Gestión de Dietas', icon: null, bi: 'bi-egg-fried', id: 'dietas', role: 'ADMIN,NUTRICIONISTA,USUARIO', options: [
          { title: 'Planes de Dietas', route: 'dietas', role: 'ADMIN,NUTRICIONISTA,USUARIO', icon: null, bi: 'bi-egg-fried' },
        ]
      },

    ];
  }

  activeButtons(role: any) {
    if (!role || role === '') return true;

    const roles = role.split(',').map((r: string) => r.trim());
    const hasAccess = roles.includes(this.userRole);
    return hasAccess;
  }

  isActiveRoute(route: string): boolean {
    return this.activeRoute.includes(route);
  }

  activePermissions(permission: string, role: string) {
    if (permission == undefined) {
      if (role == undefined) {
        return false;
      } else {
        return !this.activeButtons(role);
      }
    } else {
      return false;
    }
  }

  active(role: any) {
    if (role == undefined) {
      return false;
    } else {
      const shouldHide = !this.activeButtons(role);
      return shouldHide;
    }
  }

}