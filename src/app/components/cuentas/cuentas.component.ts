import { Component } from '@angular/core';
import { ClienteService } from '../../services/clientes.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, RouterOutlet } from '@angular/router';
@Component({
  selector: 'app-cuentas',
  standalone: true,
  imports: [CommonModule,FormsModule,RouterModule],
  templateUrl: './cuentas.component.html',
  styleUrls: ['./cuentas.component.scss']
})
export class CuentasComponent {
  cedulaBusqueda = '';
  cuenta: any = null;
  error = '';

  cuentaNueva = {
    cedula: '',
    numeroCuenta: '',
    saldo: 0
  };

  constructor(private clienteService: ClienteService) {}

  buscarCuenta() {
    this.error = '';
    this.cuenta = null;

    this.clienteService.getCuentaPorCedula(this.cedulaBusqueda).subscribe({
      next: (data) => this.cuenta = data,
      error: () => this.error = 'Cuenta no encontrada'
    });
  }

  crearCuenta() {
    this.clienteService.getClientePorCedula(this.cuentaNueva.cedula).subscribe({
      next: (cliente) => {
        const nuevaCuenta = {
          numero_cuenta: this.cuentaNueva.numeroCuenta,
          cliente_id: cliente.id,
          saldo: this.cuentaNueva.saldo
        };

        this.clienteService.crearCuenta(nuevaCuenta).subscribe({
          next: () => {
            alert('Cuenta creada correctamente');
            this.cuentaNueva = { cedula: '', numeroCuenta: '', saldo: 0 };
          },
          error: () => alert('Error al crear cuenta')
        });
      },
      error: () => alert('Cliente no encontrado')
    });
  }
}
