import { Component, OnInit } from '@angular/core';
import { ClienteService } from '../../services/clientes.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { EstadoService } from '../../services/estado.service';
@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './clientes.component.html',
  styleUrls: ['./clientes.component.scss']
})
export class ClientesComponent implements OnInit {
  clientes: any[] = [];
  nuevoCliente = {
    cedula: '',
    nombre: '',
    apellido: '',
    correo: '',
    direccion: ''
  };
  editando = false;
  idEditando: number | null = null;
  soloLectura = false; // ✅ nuevo

  constructor(private clienteService: ClienteService, private estado: EstadoService) {}

  ngOnInit(): void {
    this.estado.soloLectura$.subscribe(valor => this.soloLectura = valor); // ✅ escucha cambios
    this.cargarClientes();
  }

  cargarClientes(): void {
    this.clienteService.getClientes().subscribe(data => this.clientes = data);
  }

  agregarCliente(): void {
    if (this.soloLectura) return;
    this.clienteService.crearCliente(this.nuevoCliente).subscribe(() => {
      this.nuevoCliente = { cedula: '', nombre: '', apellido: '', correo: '', direccion: '' };
      this.cargarClientes();
    });
  }

  editarCliente(cliente: any): void {
    this.nuevoCliente = { ...cliente };
    this.idEditando = cliente.id;
    this.editando = true;
  }

  actualizarCliente(): void {
    if (this.soloLectura || this.idEditando === null) return;

    this.clienteService.actualizarCliente(this.idEditando, this.nuevoCliente).subscribe(() => {
      this.nuevoCliente = { cedula: '', nombre: '', apellido: '', correo: '', direccion: '' };
      this.idEditando = null;
      this.editando = false;
      this.cargarClientes();
    });
  }

  cancelarEdicion(): void {
    this.nuevoCliente = { cedula: '', nombre: '', apellido: '', correo: '', direccion: '' };
    this.idEditando = null;
    this.editando = false;
  }

  eliminarCliente(id: number): void {
    if (this.soloLectura) return;
    this.clienteService.eliminarCliente(id).subscribe(() => this.cargarClientes());
  }
}
