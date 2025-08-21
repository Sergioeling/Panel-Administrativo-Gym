import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AltaAlimento } from './alta-alimento';

describe('AltaAlimento', () => {
  let component: AltaAlimento;
  let fixture: ComponentFixture<AltaAlimento>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AltaAlimento]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AltaAlimento);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
