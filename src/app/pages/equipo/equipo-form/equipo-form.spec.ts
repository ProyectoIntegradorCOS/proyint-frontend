import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EquipoForm } from './equipo-form';

describe('EquipoForm', () => {
  let component: EquipoForm;
  let fixture: ComponentFixture<EquipoForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EquipoForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EquipoForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
