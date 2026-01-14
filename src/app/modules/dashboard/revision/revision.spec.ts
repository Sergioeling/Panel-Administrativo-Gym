import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Revision } from './revision';

describe('Revision', () => {
  let component: Revision;
  let fixture: ComponentFixture<Revision>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Revision]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Revision);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
