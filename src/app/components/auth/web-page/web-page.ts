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
  private auth = inject(AuthServices);
  private router = inject(Router);

   constructor(public modalService: NgbModal) {}

  

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
