import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar-public',
  imports: [CommonModule],
  templateUrl: './navbar-public.html',
  styleUrl: './navbar-public.scss'
})
export class NavbarPublic {
  @Output() openLoginModal = new EventEmitter<void>();
  @Output() scrollToSection = new EventEmitter<string>();

  onOpenLogin() {
    this.openLoginModal.emit();
  }

  onScrollToSection(sectionId: string) {
    this.scrollToSection.emit(sectionId);
  }
}
