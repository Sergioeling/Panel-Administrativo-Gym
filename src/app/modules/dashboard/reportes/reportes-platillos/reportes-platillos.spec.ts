import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportesPlatillos } from './reportes-platillos';

describe('ReportesPlatillos', () => {
  let component: ReportesPlatillos;
  let fixture: ComponentFixture<ReportesPlatillos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportesPlatillos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportesPlatillos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
