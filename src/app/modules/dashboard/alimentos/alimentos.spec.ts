import { ComponentFixture, TestBed } from '@angular/core/testing';

import { alimentos } from './alimentos';

describe('alimentos', () => {
  let component: alimentos;
  let fixture: ComponentFixture<alimentos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [alimentos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(alimentos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
