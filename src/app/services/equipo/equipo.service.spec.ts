import { TestBed } from '@angular/core/testing';

import { EquipoService } from './equipo.service';

describe('Equipo', () => {
  let service: Equipo;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Equipo);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
