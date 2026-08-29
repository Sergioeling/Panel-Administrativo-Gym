import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AppSettingsService } from '../../../app-settings.service';

@Injectable({
  providedIn: 'root'
})
export class RevisionService {

  private baseUrl = AppSettingsService.API_ENDPOINT;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders(AppSettingsService.getHeaders(true));
  }

  getNutricionistasPendientes() {
    return this.http.get<any>(
      `${this.baseUrl}nutricionistas-pendientes`,
      { headers: this.getAuthHeaders() }
    );
  }

  getPlatillosPendientes() {
    return this.http.get<any>(
      `${this.baseUrl}platillos-pendientes`,
      { headers: this.getAuthHeaders() }
    );
  }

  revisionPlatillo(id: number, estado: number, id_Usuario: number, motivo?: string) {
    return this.http.put<any>(
      `${this.baseUrl}platillos-revision`,
      { id, estado, motivo, id_Usuario },
      { headers: this.getAuthHeaders() }
    );
  }

  getDocumentosUsuario(usuarioId: number) {
    return this.http.get<any>(
      `${this.baseUrl}documentos-usuario&id=${usuarioId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  aprobarDocumento(documentoId: number) {
    return this.http.put<any>(
      `${this.baseUrl}documento-aprobar`,
      { documento_id: documentoId },
      { headers: this.getAuthHeaders() }
    );
  }

  rechazarNutricionista(usuarioId: number, motivo: string) {
    return this.http.put<any>(
      `${this.baseUrl}nutricionista-rechazar`,
      { usuario_id: usuarioId, motivo },
      { headers: this.getAuthHeaders() }
    );
  }

  rechazarDocumentoNutricionista(documentoId: number, motivo: string) {
    return this.http.put<any>(
      `${this.baseUrl}documento-rechazar`,
      { documento_id: documentoId, motivo },
      { headers: this.getAuthHeaders() }
    );
  }

  getAlimentosPendientes() {
    return this.http.get<any>(
      `${this.baseUrl}alimentos-pendientes`,
      { headers: this.getAuthHeaders() }
    );
  }

  getAlimentoDetalle(id: number) {
    return this.http.post<any>(
      `${this.baseUrl}alimento-detalle`,
      { id },
      { headers: this.getAuthHeaders() }
    );
  }

  aprobarAlimento(id: number, id_usuario: number) {
    return this.http.put<any>(
      `${this.baseUrl}alimento-aprobar`,
      { id, id_usuario },
      { headers: this.getAuthHeaders() }
    );
  }

  rechazarAlimento(id: number, id_usuario: number, motivo: string) {
    return this.http.put<any>(
      `${this.baseUrl}alimento-rechazar`,
      { id, id_usuario, motivo },
      { headers: this.getAuthHeaders() }
    );
  }
}