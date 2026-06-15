import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CuestionarioForm } from './cuestionario-form';

describe('CuestionarioForm', () => {
  let component: CuestionarioForm;
  let fixture: ComponentFixture<CuestionarioForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CuestionarioForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CuestionarioForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
