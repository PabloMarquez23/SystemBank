import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class MovimientoService {
  private apiUrl = '/api';

  constructor(private http: HttpClient) {}

  // Transferencia usa número de cuenta (no ID)
  transferir(data: { numero_origen: string, numero_destino: string, monto: number }) {
    return this.http.post(`${this.apiUrl}/transferencias`, data);
  }

  // Depósito usa número de cuenta
  depositar(data: { numero_cuenta: string, monto: number }) {
    return this.http.post(`${this.apiUrl}/depositos`, data);
  }

  // Retiro usa número de cuenta
  retirar(data: { numero_cuenta: string, monto: number }) {
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