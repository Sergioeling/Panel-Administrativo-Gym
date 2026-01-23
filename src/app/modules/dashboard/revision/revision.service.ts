import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class RevisionService {

  constructor(private http: HttpClient) {}

        getNutricionistasPendientes() {
          const token = localStorage.getItem('token');

          const headers = new HttpHeaders({
            Authorization: `Bearer ${token}`
          });

          return this.http.get<any>(
            'http://localhost/Backend/Rutas.php?nutricionistas-pendientes',
            { headers }
          );
        }

      getPlatillosPendientes() {
        const token = localStorage.getItem('token');

        const headers = new HttpHeaders({
          Authorization: `Bearer ${token}`
        });

        return this.http.get<any>(
          'http://localhost/Backend/Rutas.php?platillos-pendientes',
          { headers }
        );
      }

      revisionPlatillo(id: number, estado: number, motivo?: string) {
        const token = localStorage.getItem('token');

        const headers = new HttpHeaders({
          Authorization: `Bearer ${token}`
        });

        return this.http.put<any>(
          'http://localhost/Backend/Rutas.php?platillos-revision',
          {
            id,
            estado,
            motivo
          },
          { headers }
        );
      }

      getDocumentosUsuario(usuarioId: number) {
        const token = localStorage.getItem('token');

        const headers = new HttpHeaders({
          Authorization: `Bearer ${token}`
        });

        return this.http.get<any>(
          `http://localhost/Backend/Rutas.php?documentos-usuario&id=${usuarioId}`,
          { headers }
        );
      }

      aprobarDocumento(documentoId: number) {
        const token = localStorage.getItem('token');

        const headers = new HttpHeaders({
          Authorization: `Bearer ${token}`
        });

        return this.http.put<any>(
          'http://localhost/Backend/Rutas.php?documento-aprobar',
          { documento_id: documentoId },
          { headers }
        );
      }


}
