import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AltaTipoObjetivo } from './alta-tipo-objetivo';

describe('AltaTipoObjetivo', () => {
  let component: AltaTipoObjetivo;
  let fixture: ComponentFixture<AltaTipoObjetivo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AltaTipoObjetivo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AltaTipoObjetivo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
