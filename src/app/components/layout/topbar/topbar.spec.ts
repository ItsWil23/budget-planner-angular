import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Topbar } from './topbar';

describe('Topbar', () => {
  let component: Topbar;
  let fixture: ComponentFixture<Topbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Topbar],
    }).compileComponents();

    fixture = TestBed.createComponent(Topbar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit menuToggle when the hamburger is clicked', () => {
    let emitted = 0;
    component.menuToggle.subscribe(() => emitted++);

    const hamburger: HTMLButtonElement = fixture.nativeElement.querySelector('.hamburger');
    hamburger.click();

    expect(emitted).toBe(1);
  });

  it('should reflect menuOpen with the hidden class on the hamburger', () => {
    const hamburger: HTMLElement = fixture.nativeElement.querySelector('.hamburger');
    expect(hamburger.classList.contains('hidden')).toBe(false);

    fixture.componentRef.setInput('menuOpen', true);
    fixture.detectChanges();
    expect(hamburger.classList.contains('hidden')).toBe(true);

    fixture.componentRef.setInput('menuOpen', false);
    fixture.detectChanges();
    expect(hamburger.classList.contains('hidden')).toBe(false);
  });
});
