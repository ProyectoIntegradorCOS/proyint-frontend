import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpcionForm } from './opcion-form';

describe('OpcionForm', () => {
  let component: OpcionForm;
  let fixture: ComponentFixture<OpcionForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OpcionForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpcionForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
