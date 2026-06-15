import { TestBed } from '@angular/core/testing';

import { PlanVisitaService } from './plan-visita.service';

describe('PlanVisitaService', () => {
  let service: PlanVisitaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlanVisitaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
