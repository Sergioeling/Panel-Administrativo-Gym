import { Component, Input, OnInit } from '@angular/core';
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
export class VistaDocumentos implements OnInit {

  @Input() usuario!: {
    id: number;
    nombre: string;
    email: string;
  };

  documentos: any[] = [];
  loading = true;

  constructor(
    public activeModal: NgbActiveModal,
    private revisionService: RevisionService
  ) {}

  ngOnInit(): void {
    this.obtenerDocumentos();
  }

  obtenerDocumentos(): void {
    this.revisionService.getDocumentosUsuario(this.usuario.id)
      .subscribe({
        next: (resp) => {
          if (resp.status === 'success') {
            this.documentos = resp.data;
          }
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  cerrar(): void {
    this.activeModal.close();
  }
}
