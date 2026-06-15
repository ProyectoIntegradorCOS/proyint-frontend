import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ColaboradorForm } from './colaborador-form';

describe('ColaboradorForm', () => {
  let component: ColaboradorForm;
  let fixture: ComponentFixture<ColaboradorForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColaboradorForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ColaboradorForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
