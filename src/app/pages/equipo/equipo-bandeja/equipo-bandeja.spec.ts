import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EquipoBandeja } from './equipo-bandeja';

describe('EquipoBandeja', () => {
  let component: EquipoBandeja;
  let fixture: ComponentFixture<EquipoBandeja>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EquipoBandeja]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EquipoBandeja);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
