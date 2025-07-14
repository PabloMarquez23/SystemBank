import { Component, OnInit } from '@angular/core';
import { MovimientoService } from '../../services/movimiento.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-movimientos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './movimientos.component.html',
  styleUrls: ['./movimientos.component.scss']
})
export class MovimientosComponent implements OnInit {

  transferencia = { origen: 0, destino: 0, monto: 0 };
  deposito = { cuenta_id: 0, monto: 0 };
  retiro = { cuenta_id: 0, monto: 0 };

  transferencias: any[] = [];
  depositos: any[] = [];
  retiros: any[] = [];

  constructor(private movimientoService: MovimientoService) {}

  ngOnInit(): void {
    this.cargarTransferencias();
    this.cargarDepositos();
    this.cargarRetiros();
  }

  realizarTransferencia(): void {
    this.movimientoService.transferir(this.transferencia).subscribe(() => {
      this.transferencia = { origen: 0, destino: 0, monto: 0 };
      this.cargarTransferencias();
    });
  }

  realizarDeposito(): void {
    this.movimientoService.depositar(this.deposito).subscribe(() => {
      this.deposito = { cuenta_id: 0, monto: 0 };
      this.cargarDepositos();
    });
  }

  realizarRetiro(): void {
    this.movimientoService.retirar(this.retiro).subscribe(() => {
      this.retiro = { cuenta_id: 0, monto: 0 };
      this.cargarRetiros();
    });
  }

  cargarTransferencias(): void {
    this.movimientoService.getTransferencias().subscribe(data => {
      this.transferencias = data as any[];
    });
  }

  cargarDepositos(): void {
    this.movimientoService.getDepositos().subscribe(data => {
      this.depositos = data as any[];
    });
  }

  cargarRetiros(): void {
    this.movimientoService.getRetiros().subscribe(data => {
      this.retiros = data as any[];
    });
  }
}
