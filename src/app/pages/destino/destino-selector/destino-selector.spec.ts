import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DestinoSelector } from './destino-selector';

describe('DestinoSelector', () => {
  let component: DestinoSelector;
  let fixture: ComponentFixture<DestinoSelector>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DestinoSelector]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DestinoSelector);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
