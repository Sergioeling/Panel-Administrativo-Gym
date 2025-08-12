import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from "@angular/router";
import { MatDrawer, MatDrawerContainer, MatSidenavModule } from "@angular/material/sidenav";
import { MatIconButton } from "@angular/material/button";
import { MatIcon } from "@angular/material/icon";
import { AuthServices } from "../core/services/auth.service";
import { NgClass, NgForOf, NgIf } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-panel-admin',
  standalone: true,
  imports: [
    RouterOutlet,
    MatCardModule,
    MatDrawerContainer,
    MatDrawer,
    MatSidenavModule,
    MatIconButton,
    MatIcon,
    NgForOf,
    NgIf,
    FormsModule,
    CommonModule
  ],
  templateUrl: './panel-admin.html',
  styleUrl: './panel-admin.scss'
})
export class PanelAdmin implements OnInit {
  private auth = inject(AuthServices);
  private router = inject(Router);

  protected menu: any[] = [];
  protected user: string = 'Admin PowerGym';
  protected userRole: string = 'ADMIN';
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
    this.expandedMenus['dashboard'] = true;
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

  redirectTo(url: any) {
    if (url == 'web') {
      localStorage.clear();
    }
    this.router.navigate([url]);
  }

  InitMenu() {
    this.menu = [
      {
        title: 'Dashboard', icon: null, bi: 'bi-speedometer2', id: 'dashboard', options: [
          { title: 'Inicio', route: 'inicio', role: 'general', icon: null, bi: 'bi-house' },
        ]
      },
      {
        title: 'Gestión de Miembros', icon: null, bi: 'bi-people', id: 'miembros', role: 'ADMIN', options: [
          { title: 'Lista de Miembros', route: 'miembros', role: 'ADMIN', icon: null, bi: 'bi-person-check' },
          { title: 'Registro Nuevo', route: 'registro-miembros', role: 'ADMIN,RECEPCIONISTA', icon: null, bi: 'bi-person-plus' },
        ]
      },
      {
        title: 'Personal', icon: null, bi: 'bi-people-fill', id: 'personal', role: 'ADMIN', options: [
          { title: 'Entrenadores', route: 'entrenadores', role: 'ADMIN', icon: null, bi: 'bi-person-arms-up' },
        ]
      },
      {
        title: 'Nutrición y Ejercicios', icon: null, bi: 'bi-apple', id: 'nutricion', role: 'ADMIN,ENTRENADOR', options: [
          { title: 'Planes de Dietas', route: 'dietas', role: 'ADMIN,ENTRENADOR', icon: null, bi: 'bi-egg-fried' },
          { title: 'Rutinas de Ejercicio', route: 'ejercicios', role: 'ADMIN,ENTRENADOR', icon: null, bi: 'bi-activity' },
        ]
      },


    ];
  }

  activeButtons(role: any) {
    if (!role) return true;
    const roles = role.split(',');
    return roles.includes(this.userRole);
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
      return !this.activeButtons(role);
    }
  }

  openContent(value: any) {
    // Lógica para abrir contenido
  }
}