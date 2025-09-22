import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AltaTipoDieta } from './alta-tipo-dieta';

describe('AltaTipoDieta', () => {
  let component: AltaTipoDieta;
  let fixture: ComponentFixture<AltaTipoDieta>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AltaTipoDieta]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AltaTipoDieta);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
