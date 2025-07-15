import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { retry, timeout } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  private apiUrl = '/api';

  constructor(private http: HttpClient) {}

  getClientes() {
    return this.http.get<any[]>(`${this.apiUrl}/clientes`).pipe(
      retry(3),        // Reintenta 3 veces en caso de error
      timeout(5000)    // Si no responde en 5 segundos, lanza error
    );
  }

  crearCliente(cliente: { nombre: string, correo: string }) {
    return this.http.post(`${this.apiUrl}/clientes`, cliente);
  }

  actualizarCliente(id: number, cliente: any) {
    return this.http.put<any>(`${this.apiUrl}/clientes/${id}`, cliente);
  }

  eliminarCliente(id: number) {
    return this.http.delete(`${this.apiUrl}/clientes/${id}`);
  }

  crearCuenta(cuenta: { numero_cuenta: string; cliente_id: number; saldo: number }) {
    return this.http.post('/api/cuentas', cuenta);
  }

  getClientePorCedula(cedula: string) {
    return this.http.get<any>(`/api/clientes/cedula/${cedula}`);
  }

  getCuentaPorCedula(cedula: string) {
    return this.http.get<any>(`/api/cuentas/cedula/${cedula}`);
  }
}
