import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

//import { PerfilEditModal } from './perfil-edit.modal'; // 👉 lo vamos a crear

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './perfil.html',
  styleUrls: ['./perfil.scss']
})
export class Perfil {
  private modalService = inject(NgbModal);

  user = {
    nombre: 'Admin PowerGym',
    email: 'admin@powergym.com',
    rol: 'ADMIN',
    ultimoAcceso: 'Hoy - 14:30'
  };
/*
  editarPerfil() {
    const modalRef = this.modalService.open(PerfilEditModal, { centered: true });
    modalRef.componentInstance.userData = { ...this.user };

    modalRef.result.then((result) => {
      if (result) {
        this.user = result; // Actualizar datos en el perfil
      }
    }).catch(() => { });
  }
    */
}
