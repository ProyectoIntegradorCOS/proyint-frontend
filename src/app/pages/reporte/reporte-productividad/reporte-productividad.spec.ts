import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReporteProductividad } from './reporte-productividad';

describe('ReporteProductividad', () => {
  let component: ReporteProductividad;
  let fixture: ComponentFixture<ReporteProductividad>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReporteProductividad]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReporteProductividad);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
