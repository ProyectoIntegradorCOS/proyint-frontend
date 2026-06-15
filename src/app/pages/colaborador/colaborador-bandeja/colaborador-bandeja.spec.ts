import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ColaboradorBandeja } from './colaborador-bandeja';

describe('ColaboradorBandeja', () => {
  let component: ColaboradorBandeja;
  let fixture: ComponentFixture<ColaboradorBandeja>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColaboradorBandeja]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ColaboradorBandeja);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
