import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

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
  private alreadyAlerted = false;

  constructor(private http: HttpClient) {
    setInterval(() => {
      this.http.get('/api/status').subscribe({
        next: () => {
          this.errorMsg = '';
          this.alreadyAlerted = false;
        },
        error: () => {
          this.errorMsg = '⚠️ El sistema estará disponible en un momento...';
          if (!this.alreadyAlerted) {
            window.alert(this.errorMsg);
            this.alreadyAlerted = true;
          }
        }
      });
    }, 5000);
  }
}
