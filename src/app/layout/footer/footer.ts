import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [],
  templateUrl: './footer.html',
  styleUrls: ['./footer.css']
})
export class Footer {
  titulo = "Año de la recuperación y consolidación de la economía peruana.";
  version = '1.0.0';
}