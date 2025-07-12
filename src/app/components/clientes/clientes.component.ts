import { Component, OnInit } from '@angular/core';
import { ClienteService } from '../../services/clientes.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, RouterOutlet } from '@angular/router';
@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule,RouterModule],
  templateUrl: './clientes.component.html',
  styleUrl: './clientes.component.scss'
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

  constructor(private clienteService:ClienteService) {}

  ngOnInit(): void {
    this.cargarClientes();
  }

  cargarClientes(): void {
    this.clienteService.getClientes().subscribe(data => this.clientes = data);
  }

  agregarCliente(): void {
  this.clienteService.crearCliente(this.nuevoCliente).subscribe(() => {
    this.nuevoCliente = {
      cedula: '',
      nombre: '',
      apellido: '',
      correo: '',
      direccion: ''
    };
    this.cargarClientes();
  });
}


  editarCliente(cliente: any): void {
  this.nuevoCliente = {
    cedula: cliente.cedula,
    nombre: cliente.nombre,
    apellido: cliente.apellido,
    correo: cliente.correo,
    direccion: cliente.direccion
  };
  this.idEditando = cliente.id;
  this.editando = true;
}

  actualizarCliente(): void {
  if (this.idEditando != null) {
    this.clienteService.actualizarCliente(this.idEditando, this.nuevoCliente).subscribe(() => {
      this.nuevoCliente = {
        cedula: '',
        nombre: '',
        apellido: '',
        correo: '',
        direccion: ''
      };
      this.idEditando = null;
      this.editando = false;
      this.cargarClientes();
    });
  }
}


  cancelarEdicion(): void {
  this.nuevoCliente = {
    cedula: '',
    nombre: '',
    apellido: '',
    correo: '',
    direccion: ''
  };
  this.idEditando = null;
  this.editando = false;
}


  eliminarCliente(id: number): void {
    this.clienteService.eliminarCliente(id).subscribe(() => this.cargarClientes());
  }
}
