import { TestBed } from '@angular/core/testing';

import { HttpServices } from './http.service';

describe('HttpServices', () => {
  let service: HttpServices;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HttpServices);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
