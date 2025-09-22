import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TipoDietaComponent } from './tipo-dieta';

describe('TipoDieta', () => {
  let component: TipoDietaComponent;
  let fixture: ComponentFixture<TipoDietaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TipoDietaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TipoDietaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
