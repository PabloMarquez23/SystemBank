import { Routes } from '@angular/router';
import { ClientesComponent } from './components/clientes/clientes.component';
import { CuentasComponent } from './components/cuentas/cuentas.component';
import { MovimientosComponent } from './components/movimientos/movimientos.component';


export const routes: Routes = [
  { path: '', redirectTo: 'clientes', pathMatch: 'full' },
  { path: 'clientes', component: ClientesComponent },
  { path: 'cuentas', component: CuentasComponent },
  { path: 'movimientos', component: MovimientosComponent },

  // Agrega más rutas aquí si luego creas componentes para cuentas o transferencias
];
