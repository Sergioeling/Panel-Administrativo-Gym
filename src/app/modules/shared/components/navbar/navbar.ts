import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconButton } from "@angular/material/button";
import { AuthServices } from '../../../../core/services/auth/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, MatIconButton],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class Navbar {
  private auth = inject(AuthServices);

  @Input() user: string = '';
  @Input() userRole: string = '';
  @Input() isDrawerOpen: boolean = true;
  @Output() toggleDrawer = new EventEmitter<void>();
  @Output() redirectTo = new EventEmitter<string>();

  onToggleDrawer() {
    this.toggleDrawer.emit();
  }

  onRedirectTo(url: string) {
    this.redirectTo.emit(url);
  }
}
