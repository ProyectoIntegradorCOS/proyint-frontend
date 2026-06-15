import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreguntaList } from './pregunta-list';

describe('PreguntaList', () => {
  let component: PreguntaList;
  let fixture: ComponentFixture<PreguntaList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreguntaList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PreguntaList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
