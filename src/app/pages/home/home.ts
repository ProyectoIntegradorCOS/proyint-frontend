import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from '../../services/session/session.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  template: ''
})
export class HomeComponent implements OnInit {

  constructor(
    private sessionService: SessionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.sessionService.getSession()) {
      this.router.navigate(['/welcome']);
    } else {
      this.router.navigate(['/login']);
    }
  }
}
