import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AltaTipoComida } from './alta-tipo-comida';

describe('AltaTipoComida', () => {
  let component: AltaTipoComida;
  let fixture: ComponentFixture<AltaTipoComida>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AltaTipoComida]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AltaTipoComida);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
