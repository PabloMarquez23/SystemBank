import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { EstadoService } from './services/estado.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterOutlet, RouterModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'systembank';
  errorMsg = '';
  soloLectura = false;
  private alreadyAlerted = false;

  constructor(private http: HttpClient, private estado: EstadoService) {
    this.verificarEstado();
    setInterval(() => this.verificarEstado(), 5000);
  }

  verificarEstado() {
    this.http.get<{ status: string; soloLectura: boolean }>('/api/status').subscribe({
      next: (resp) => {
        this.errorMsg = '';
        this.soloLectura = resp.soloLectura;
        this.estado.setSoloLectura(this.soloLectura);
        this.alreadyAlerted = false;
        console.log('Modo solo lectura:', this.soloLectura);
      },
      error: () => {
        this.errorMsg = '⚠️ El sistema estará disponible en un momento...';
        this.soloLectura = true;
        this.estado.setSoloLectura(true);

        if (!this.alreadyAlerted) {
          window.alert(this.errorMsg);
          this.alreadyAlerted = true;
        }
      }
    });
  }
}