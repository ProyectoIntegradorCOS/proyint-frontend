import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VisitaBandeja } from './visita-bandeja';

describe('VisitaBandeja', () => {
  let component: VisitaBandeja;
  let fixture: ComponentFixture<VisitaBandeja>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisitaBandeja]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VisitaBandeja);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
