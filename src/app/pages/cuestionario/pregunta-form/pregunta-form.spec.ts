import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreguntaForm } from './pregunta-form';

describe('PreguntaForm', () => {
  let component: PreguntaForm;
  let fixture: ComponentFixture<PreguntaForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreguntaForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PreguntaForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
