import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AltaPlatillos } from './alta-platillos';

describe('AltaPlatillos', () => {
  let component: AltaPlatillos;
  let fixture: ComponentFixture<AltaPlatillos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AltaPlatillos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AltaPlatillos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
