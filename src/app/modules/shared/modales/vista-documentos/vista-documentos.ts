import { Component, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { RevisionService } from '../../../dashboard/revision/revision.service';

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
    // Cambio visual inmediato (rechazado)
    doc.estado = 0;
    this.cdr.detectChanges();
  }

  cerrar(): void {
  this.activeModal.close(true);
}



}
