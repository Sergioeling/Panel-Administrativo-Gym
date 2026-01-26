import { Component, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { RevisionService } from '../../../dashboard/revision/revision.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-vista-documentos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vista-documentos.html',
  styleUrls: ['./vista-documentos.scss']
})
export class VistaDocumentos {

  private _usuario!: {
    id: number;
    nombre: string;
    email: string;
  };

  @Input()
  set usuario(value: any) {
    if (value?.id) {
      this._usuario = value;
      this.obtenerDocumentos();
    }
  }

  get usuario() {
    return this._usuario;
  }

  documentos: any[] = [];
  loading = true;

  constructor(
    public activeModal: NgbActiveModal,
    private revisionService: RevisionService,
    private cdr: ChangeDetectorRef
  ) {}

  obtenerDocumentos(): void {
    this.loading = true;

    this.revisionService.getDocumentosUsuario(this.usuario.id)
      .subscribe({
        next: (resp) => {
          this.documentos = resp.status === 'success' ? resp.data : [];
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error(err);
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  /* =========================
   *  ACCIONES (SOLO UI POR AHORA)
   * ========================= */

  aceptarDocumento(doc: any): void {
  this.revisionService.aprobarDocumento(doc.id)
    .subscribe({
      next: () => {
        doc.estado = 1;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al aprobar documento', err);
      }
    });
}


 rechazarDocumento(doc: any): void {
  Swal.fire({
    title: 'Rechazar documento',
    text: 'Escribe el motivo del rechazo',
    input: 'textarea',
    inputPlaceholder: 'Motivo del rechazo...',
    showCancelButton: true,
    confirmButtonText: 'Rechazar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#dc2626',
    inputValidator: (value) => {
      if (!value || !value.trim()) {
        return 'El motivo es obligatorio';
      }
      return null;
    }
  }).then((result) => {
    if (result.isConfirmed) {

      this.revisionService
        .rechazarDocumentoNutricionista(doc.id, result.value)
        .subscribe({
          next: () => {
            doc.estado = 0;
            this.cdr.detectChanges();

            Swal.fire({
              icon: 'success',
              title: 'Documento rechazado',
              timer: 2000,
              showConfirmButton: false
            });
          },
          error: () => {
            Swal.fire(
              'Error',
              'No se pudo rechazar el documento',
              'error'
            );
          }
        });
    }
  });
}


  cerrar(): void {
  this.activeModal.close(true);
}



}
