import { TestBed } from '@angular/core/testing';

import { Sesion } from './session.service';

describe('Sesion', () => {
  let service: Sesion;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Sesion);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
