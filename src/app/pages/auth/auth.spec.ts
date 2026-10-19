import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { Auth } from './auth';

@Component({
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
class RouterHost {}

describe('Auth', () => {
  let component: Auth;
  let fixture: ComponentFixture<Auth>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        Auth,
        RouterHost,
        TranslocoTestingModule.forRoot({
          langs: {
            fr: {
              auth: {
                login: { title: 'Se connecter' },
                register: { title: "S'inscrire" },
              },
            },
          },
          translocoConfig: { availableLangs: ['fr', 'en'], defaultLang: 'fr' },
          preloadLangs: true,
        }),
      ],
      providers: [
        provideRouter([
          { path: 'auth/login', component: Auth },
          { path: 'auth/register', component: Auth },
        ]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Auth);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the French login title', () => {
    fixture.detectChanges();

    const title: HTMLHeadingElement = fixture.nativeElement.querySelector('h1');
    expect(title.textContent?.trim()).toBe('Se connecter');
  });

  it('should set autocomplete="current-password" on the password field in login mode', () => {
    fixture.detectChanges();

    const passwordInput: HTMLInputElement = fixture.nativeElement.querySelector('#password');
    expect(passwordInput.getAttribute('autocomplete')).toBe('current-password');
  });

  it('should set autocomplete="new-password" on the password field in register mode', async () => {
    const hostFixture = TestBed.createComponent(RouterHost);
    await TestBed.inject(Router).navigateByUrl('/auth/register');
    hostFixture.detectChanges();
    await hostFixture.whenStable();

    const passwordInput: HTMLInputElement = hostFixture.nativeElement.querySelector('#password');
    expect(passwordInput.getAttribute('autocomplete')).toBe('new-password');
  });
});
