import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/core';

import { Theme } from './theme';

describe('Theme', () => {
  let service: Theme;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Theme);
    TestBed.tick();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set data-theme attribute to "dark" on initialization', () => {
    const document = TestBed.inject(DOCUMENT);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should toggle data-theme attribute between "dark" and "light"', () => {
    const document = TestBed.inject(DOCUMENT);
    service.toggleTheme();
    TestBed.tick();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    service.toggleTheme();
    TestBed.tick();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});