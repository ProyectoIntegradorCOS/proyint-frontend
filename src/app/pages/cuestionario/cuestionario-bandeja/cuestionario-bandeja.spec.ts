import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CuestionarioBandeja } from './cuestionario-bandeja';

describe('CuestionarioBandeja', () => {
  let component: CuestionarioBandeja;
  let fixture: ComponentFixture<CuestionarioBandeja>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CuestionarioBandeja]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CuestionarioBandeja);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
