import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class MovimientoService {
  private apiUrl = '/api';

  constructor(private http: HttpClient) {}

  transferir(data: { origen: number, destino: number, monto: number }) {
    return this.http.post(`${this.apiUrl}/transferencias`, data);
  }

  depositar(data: { cuenta_id: number, monto: number }) {
    return this.http.post(`${this.apiUrl}/depositos`, data);
  }

  retirar(data: { cuenta_id: number, monto: number }) {
    return this.http.post(`${this.apiUrl}/retiros`, data);
  }

  getTransferencias() {
    return this.http.get(`${this.apiUrl}/transferencias`);
  }

  getDepositos() {
    return this.http.get(`${this.apiUrl}/depositos`);
  }

  getRetiros() {
    return this.http.get(`${this.apiUrl}/retiros`);
  }
}
