import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopbarComponent } from './layout/topbar/topbar';
import { SidebarComponent } from './layout/sidebar/sidebar';
import { Footer } from './layout/footer/footer';
import { GlobalModalComponent } from './shared/global-modal/global-modal.component';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TopbarComponent, SidebarComponent, Footer, GlobalModalComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
}) 
export class App {}
