import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthServices } from '../../../core/services/auth.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Login } from '../login/login';

@Component({
  selector: 'app-web-page',
  imports: [CommonModule],
  templateUrl: './web-page.html',
  styleUrl: './web-page.scss'
})
export class WebPage {
  // Hacer público el servicio auth para usarlo en el template
  public auth = inject(AuthServices);
  private router = inject(Router);

  constructor(public modalService: NgbModal) {
    // Verificación inmediata en el constructor para evitar parpadeo
    if (this.isBrowser() && this.auth.isAuthenticated()) {
      this.router.navigate(['/dashboard'], { replaceUrl: true });
    }
  }

  // Verificar si estamos en el browser
  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }


  ngOnInit(): void {
    // Redirige si ya está autenticado, evita que se muestre la web pública
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/panel-clinica']);
    }
  }



  openAddModal(item?: any, edit?: boolean): void {
    const modalRef = this.modalService.open(Login, {
      backdrop: 'static',
      size: 'lg',
    });
  }

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }

}
