import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AltaUsuarios } from './alta-usuarios';

describe('AltaUsuarios', () => {
  let component: AltaUsuarios;
  let fixture: ComponentFixture<AltaUsuarios>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AltaUsuarios]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AltaUsuarios);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
