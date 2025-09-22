import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TipoObjetivoComponent } from './tipo-objetivo';

describe('TipoObjetivo', () => {
  let component: TipoObjetivoComponent;
  let fixture: ComponentFixture<TipoObjetivoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TipoObjetivoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TipoObjetivoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
