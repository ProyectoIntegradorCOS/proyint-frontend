import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VisitaFormComponent } from './visita-form';

describe('VisitaForm', () => {
  let component: VisitaFormComponent;
  let fixture: ComponentFixture<VisitaFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisitaFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VisitaFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
