import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TipoComidaComponent } from './tipo-comida';

describe('TipoComida', () => {
  let component: TipoComidaComponent;
  let fixture: ComponentFixture<TipoComidaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TipoComidaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TipoComidaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
