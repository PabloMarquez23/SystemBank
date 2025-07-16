import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class EstadoService {
  private _soloLectura = new BehaviorSubject<boolean>(false);
  soloLectura$ = this._soloLectura.asObservable();

  setSoloLectura(value: boolean) {
    this._soloLectura.next(value);
  }
}
