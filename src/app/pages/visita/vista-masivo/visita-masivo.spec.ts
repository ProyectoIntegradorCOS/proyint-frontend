import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VisitaMasivoComponent } from './visita-masivo';

describe('VisitaMasivo', () => {
  let component: VisitaMasivo;
  let fixture: ComponentFixture<VisitaMasivo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisitaMasivoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VisitaMasivoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
