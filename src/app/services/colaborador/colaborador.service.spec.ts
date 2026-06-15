import { TestBed } from '@angular/core/testing';

import { ColaboradorService } from './colaborador.service';

describe('Colaborador', () => {
  let service: Colaborador;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Colaborador);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
