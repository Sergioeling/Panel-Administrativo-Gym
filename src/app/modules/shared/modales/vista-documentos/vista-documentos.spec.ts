import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VistaDocumentos } from './vista-documentos';

describe('VistaDocumentos', () => {
  let component: VistaDocumentos;
  let fixture: ComponentFixture<VistaDocumentos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VistaDocumentos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VistaDocumentos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
