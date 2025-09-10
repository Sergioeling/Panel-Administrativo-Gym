import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Platillos } from './platillos';

describe('Platillos', () => {
  let component: Platillos;
  let fixture: ComponentFixture<Platillos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Platillos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Platillos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
