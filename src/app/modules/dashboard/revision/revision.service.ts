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

      revisionPlatillo(id: number, estado: number, id_Usuario: number, motivo?: string) {
        const token = localStorage.getItem('token');

        const headers = new HttpHeaders({
          Authorization: `Bearer ${token}`
        });

        return this.http.put<any>(
          'http://localhost/Backend/Rutas.php?platillos-revision',
          {
            id,
            estado,
            motivo,
            id_Usuario
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


      rechazarNutricionista(usuarioId: number, motivo: string) {
  const token = localStorage.getItem('token');

  const headers = new HttpHeaders({
    Authorization: `Bearer ${token}`
  });

  return this.http.put<any>(
    'http://localhost/Backend/Rutas.php?nutricionista-rechazar',
    {
      usuario_id: usuarioId,
      motivo
    },
    { headers }
  );
}


rechazarDocumentoNutricionista(documentoId: number, motivo: string) {
  const token = localStorage.getItem('token');

  const headers = new HttpHeaders({
    Authorization: `Bearer ${token}`
  });

  return this.http.put<any>(
    'http://localhost/Backend/Rutas.php?documento-rechazar',
    {
      documento_id: documentoId,
      motivo: motivo
    },
    { headers }
  );
}

getAlimentosPendientes() {
  const token = localStorage.getItem('token');

  const headers = new HttpHeaders({
    Authorization: `Bearer ${token}`
  });

  return this.http.get<any>(
    'http://localhost/Backend/Rutas.php?alimentos-pendientes',
    { headers }
  );
}

getAlimentoDetalle(id: number) {
  const token = localStorage.getItem('token');

  const headers = new HttpHeaders({
    Authorization: `Bearer ${token}`
  });

  return this.http.post<any>(
    'http://localhost/Backend/Rutas.php?alimento-detalle',
    { id },
    { headers }
  );
}


aprobarAlimento(id: number, id_usuario: number) {
  const token = localStorage.getItem('token');

  const headers = new HttpHeaders({
    Authorization: `Bearer ${token}`
  });

  return this.http.put<any>(
    'http://localhost/Backend/Rutas.php?alimento-aprobar',
    { id, id_usuario },
    { headers }
  );
}


  rechazarAlimento(id: number, id_usuario: number, motivo: string) {
  const token = localStorage.getItem('token');

  const headers = new HttpHeaders({
    Authorization: `Bearer ${token}`
  });

  return this.http.put<any>(
    'http://localhost/Backend/Rutas.php?alimento-rechazar',
    {
      id,
      id_usuario,
      motivo
    },
    { headers }
  );


}

}