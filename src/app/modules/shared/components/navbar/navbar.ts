import { Component, EventEmitter, Input, Output, inject, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconButton } from "@angular/material/button";
import { AuthServices } from '../../../../core/services/auth/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, MatIconButton],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class Navbar implements OnInit {
  private auth = inject(AuthServices);

  @Input() user: string = '';
  @Input() userRole: string = '';
  @Input() isDrawerOpen: boolean = true;
  @Output() toggleDrawer = new EventEmitter<void>();
  @Output() redirectTo = new EventEmitter<string>();

  // Para manejar responsive
  isMobile: boolean = false;

  ngOnInit() {
    this.checkScreenSize();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenSize();
  }

  private checkScreenSize() {
    this.isMobile = window.innerWidth < 768;
  }

  onToggleDrawer() {
    this.toggleDrawer.emit();
  }

  onRedirectTo(url: string) {
    this.redirectTo.emit(url);
  }
}